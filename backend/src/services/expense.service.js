import expenseRepo from '../repositories/expense.repo.js';
import transactionRepo from '../repositories/transaction.repo.js';
import accountRepo from '../repositories/account.repo.js';
import accountService from './account.service.js';
import trashRepo from '../repositories/trash.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { deleteStoredFile } from '../helpers/fileHelper.js';
import { requireDeleteReason } from '../helpers/deleteReason.js';
import dayjs from 'dayjs';

const resolveAccount = async (conn, accId, message) => {
  let resolved = accId ? Number(accId) : null;
  if (!resolved) {
    const def = await accountRepo.findDefault(conn);
    if (def) resolved = def.acc_id;
  }
  if (!resolved) throw ApiError.badRequest(message);
  return resolved;
};

const chargeStatus = (paid, amount, source) => {
  if (paid >= amount - 0.001) return 'Paid';
  if (paid > 0.001) return 'Partial';
  // A direct expense's charge only exists for its payment; with the payment gone it is void.
  return source === 'direct' ? 'Cancelled' : 'Pending';
};

/** Adds `delta` to a charge's paid amount and recomputes its status. */
export const applyToCharge = async (conn, chargeId, delta) => {
  const charge = await expenseRepo.findCharge(conn, chargeId);
  if (!charge) return;
  const paid = Math.max(0, Math.round((Number(charge.paid_amount) + delta) * 100) / 100);
  await expenseRepo.setChargePaid(conn, chargeId, paid, chargeStatus(paid, Number(charge.amount), charge.source));
};

/** Ledger row + account movement for money leaving (expense) or coming back (reversal). */
const postMovement = async (conn, { accId, amount, outgoing, referenceId, description, userId, date }) => {
  await transactionRepo.create(conn, {
    transaction_date: date ?? dayjs().format('YYYY-MM-DD'),
    transaction_type: outgoing ? 'Expense' : 'Income',
    reference_type: 'Expense',
    reference_id: referenceId,
    description,
    income: outgoing ? 0 : amount,
    expense: outgoing ? amount : 0,
    acc_id: accId,
    created_by: userId,
  });
  if (outgoing) await accountService.debit(conn, accId, amount);
  else await accountService.credit(conn, accId, amount);
};

export const expenseService = {
  async list(filters) {
    const rows = await expenseRepo.list(null, filters);
    const total = await expenseRepo.count(null, filters);
    return { rows, total };
  },

  async getById(id) {
    const expense = await expenseRepo.findById(null, id);
    if (!expense) throw ApiError.notFound('Expense not found');
    const files = await expenseRepo.attachments(null, id);
    return { ...expense, attachments: files };
  },

  async create(data, userId, ip) {
    return withTransaction(async (conn) => {
      const amount = Number(data.amount);
      if (!amount || amount <= 0) throw ApiError.badRequest('Expense amount must be greater than zero');
      const accId = await resolveAccount(conn, data.acc_id, 'Account is required. Create an account or set a default account.');

      const id = await expenseRepo.create(conn, { ...data, amount, acc_id: accId, created_by: userId });
      await postMovement(conn, {
        accId,
        amount,
        outgoing: true,
        referenceId: id,
        description: `Expense — ${data.description || `category ${data.expense_category_id}`}`,
        userId,
        date: data.expense_date,
      });

      await auditService.log({ module: 'Expense', action: 'CREATE', userId, recordId: id, ip });
      return expenseRepo.findById(conn, id);
    });
  },

  /**
   * Edit a recorded expense payment. Amount or account changes are booked as a reversal of
   * the old movement plus a new one — the ledger is append-only.
   */
  async update(id, data, userId, ip) {
    return withTransaction(async (conn) => {
      const expense = await expenseRepo.findById(conn, id);
      if (!expense) throw ApiError.notFound('Expense not found');

      const oldAmount = Number(expense.amount);
      const newAmount = data.amount !== undefined ? Number(data.amount) : oldAmount;
      if (!newAmount || newAmount <= 0) throw ApiError.badRequest('Amount must be greater than zero');
      const oldAcc = Number(expense.acc_id);
      const newAcc = data.acc_id ? Number(data.acc_id) : oldAcc;

      const charge = await expenseRepo.findCharge(conn, expense.expense_charge_id);
      if (charge?.source === 'charge' && newAmount - oldAmount > Number(charge.balance) + 0.001) {
        throw ApiError.badRequest(`Amount is more than what is still owed on this charge (${Number(charge.balance).toFixed(2)})`);
      }

      if (newAmount !== oldAmount || newAcc !== oldAcc) {
        await postMovement(conn, {
          accId: oldAcc,
          amount: oldAmount,
          outgoing: false,
          referenceId: id,
          description: `Correction: reverse expense ${expense.payment_number} (${expense.description || ''})`,
          userId,
        });
        await postMovement(conn, {
          accId: newAcc,
          amount: newAmount,
          outgoing: true,
          referenceId: id,
          description: `Correction: expense ${expense.payment_number} (${data.description ?? expense.description ?? ''})`,
          userId,
          date: data.expense_date ?? expense.expense_date,
        });
        await expenseRepo.updatePaymentMoney(conn, id, { amount: newAmount, account_id: newAcc });

        if (charge?.source === 'direct') {
          // The charge mirrors its single payment.
          await expenseRepo.setChargeAmountPaid(conn, charge.expense_charge_id, newAmount, newAmount, 'Paid');
        } else if (charge) {
          await applyToCharge(conn, charge.expense_charge_id, newAmount - oldAmount);
        }
      }

      if (charge && (data.expense_category_id || data.description !== undefined)) {
        await expenseRepo.updateCharge(conn, charge.expense_charge_id, {
          expense_id: data.expense_category_id ? Number(data.expense_category_id) : undefined,
          description: charge.source === 'direct' ? data.description : undefined,
        });
      }

      await expenseRepo.update(conn, id, { ...data, amount: undefined });
      await auditService.log({ module: 'Expense', action: 'UPDATE', userId, recordId: id, ip });
      return expenseRepo.findById(conn, id);
    });
  },

  async remove(id, reason, userId, ip) {
    const deleteReason = requireDeleteReason(reason);
    return withTransaction(async (conn) => {
      const expense = await expenseRepo.findById(conn, id);
      if (!expense) throw ApiError.notFound('Expense not found');

      await expenseRepo.softDelete(conn, id, { reason: deleteReason, deletedBy: userId });
      await trashRepo.add(conn, {
        entity_type: 'expense',
        entity_id: id,
        entity_label: expense.description || `Expense #${id}`,
        delete_reason: deleteReason,
        deleted_by: userId,
      });

      // Reversing entry on the SAME account keeps ledger and balance in step.
      await postMovement(conn, {
        accId: expense.acc_id,
        amount: Number(expense.amount),
        outgoing: false,
        referenceId: id,
        description: `Reversal of expense ${expense.payment_number} (${expense.description || ''})`,
        userId,
      });
      // A bill from the Charges tab becomes payable again; a direct expense's charge is voided.
      await applyToCharge(conn, expense.expense_charge_id, -Number(expense.amount));

      await auditService.log({ module: 'Expense', action: 'DELETE', userId, recordId: id, ip, details: deleteReason });
      return { expense_id: id, deleted: true };
    });
  },

  /** Trash → restore: re-apply the payment to its account and charge. */
  async restoreFromTrash(conn, id, userId) {
    const expense = await expenseRepo.findByIdIncludingDeleted(conn, id);
    if (!expense) throw ApiError.notFound('Expense not found');
    await expenseRepo.restore(conn, id);
    await postMovement(conn, {
      accId: expense.acc_id,
      amount: Number(expense.amount),
      outgoing: true,
      referenceId: id,
      description: `Restored expense ${expense.payment_number} (${expense.description || ''})`,
      userId,
    });
    await applyToCharge(conn, expense.expense_charge_id, Number(expense.amount));
  },

  /* ---------------- Charges tab ---------------- */

  async listCharges(status = 'open') {
    return expenseRepo.listCharges(null, { status });
  },

  async createCharge(data, userId, ip) {
    const amount = Number(data.amount);
    if (!amount || amount <= 0) throw ApiError.badRequest('Amount must be greater than zero');
    return withTransaction(async (conn) => {
      const category = await expenseRepo.findCategoryById(conn, Number(data.expense_category_id));
      if (!category) throw ApiError.badRequest('Invalid expense category');
      const id = await expenseRepo.createCharge(conn, {
        expense_id: category.expense_id,
        description: data.description,
        amount,
        charge_date: data.due_date || dayjs().format('YYYY-MM-DD'),
        created_by: userId,
      });
      await auditService.log({ module: 'Expense', action: 'CREATE_CHARGE', userId, recordId: id, ip });
      return expenseRepo.findCharge(conn, id);
    });
  },

  async updateCharge(chargeId, data, userId, ip) {
    return withTransaction(async (conn) => {
      const charge = await expenseRepo.findCharge(conn, chargeId);
      if (!charge || charge.source !== 'charge') throw ApiError.notFound('Charge not found');
      let amount;
      if (data.amount !== undefined) {
        amount = Number(data.amount);
        if (!amount || amount <= 0) throw ApiError.badRequest('Amount must be greater than zero');
        if (amount < Number(charge.paid_amount) - 0.001) {
          throw ApiError.badRequest(`Amount cannot be less than what was already paid (${Number(charge.paid_amount).toFixed(2)})`);
        }
      }
      if (data.expense_category_id && !(await expenseRepo.findCategoryById(conn, Number(data.expense_category_id)))) {
        throw ApiError.badRequest('Invalid expense category');
      }
      await expenseRepo.updateCharge(conn, chargeId, {
        expense_id: data.expense_category_id ? Number(data.expense_category_id) : undefined,
        description: data.description,
        amount,
        charge_date: data.due_date,
      });
      if (amount !== undefined) await applyToCharge(conn, chargeId, 0);
      await auditService.log({ module: 'Expense', action: 'UPDATE_CHARGE', userId, recordId: chargeId, ip });
      return expenseRepo.findCharge(conn, chargeId);
    });
  },

  async deleteCharge(chargeId, userId, ip) {
    const charge = await expenseRepo.findCharge(null, chargeId);
    if (!charge || charge.source !== 'charge') throw ApiError.notFound('Charge not found');
    if (Number(charge.payment_count) > 0 || Number(charge.paid_amount) > 0) {
      throw ApiError.conflict('This charge already has payments. Delete the payments on the Payments tab first.');
    }
    await expenseRepo.deleteCharge(null, chargeId);
    await auditService.log({ module: 'Expense', action: 'DELETE_CHARGE', userId, recordId: chargeId, ip });
    return { charge_id: chargeId, deleted: true };
  },

  /** Pay a Charges-tab bill (fully or in part); it moves to Payments. */
  async payCharge(chargeId, data, userId, ip) {
    return withTransaction(async (conn) => {
      const charge = await expenseRepo.findCharge(conn, chargeId);
      if (!charge || charge.source !== 'charge') throw ApiError.notFound('Charge not found');
      if (charge.status === 'Paid') throw ApiError.conflict('This charge is already paid');
      const amount = data.amount !== undefined ? Number(data.amount) : Number(charge.balance);
      if (!amount || amount <= 0) throw ApiError.badRequest('Amount must be greater than zero');
      if (amount > Number(charge.balance) + 0.001) {
        throw ApiError.badRequest(`Amount exceeds the balance of ${Number(charge.balance).toFixed(2)}`);
      }
      const accId = await resolveAccount(conn, data.acc_id, 'Select the account to pay from.');
      const paymentDate = data.expense_date || dayjs().format('YYYY-MM-DD');

      const paymentId = await expenseRepo.createPaymentForCharge(conn, chargeId, {
        acc_id: accId,
        payment_date: paymentDate,
        amount,
        payment_method: data.payment_method,
        reference_number: data.reference_number,
        paid_by: data.paid_by,
        notes: data.notes || charge.description,
        created_by: userId,
      });
      await postMovement(conn, {
        accId,
        amount,
        outgoing: true,
        referenceId: paymentId,
        description: `Expense — ${charge.description || charge.category_name}`,
        userId,
        date: paymentDate,
      });
      await applyToCharge(conn, chargeId, amount);

      await auditService.log({ module: 'Expense', action: 'PAY_CHARGE', userId, recordId: chargeId, ip });
      return expenseRepo.findById(conn, paymentId);
    });
  },

  /* ---------------- Categories ---------------- */

  async categories() {
    return expenseRepo.categories(null);
  },

  async createCategory(name, userId, ip) {
    const trimmed = String(name || '').trim();
    if (await expenseRepo.categoryNameTaken(null, trimmed)) throw ApiError.conflict('A category with this name already exists');
    const id = await expenseRepo.createCategory(null, trimmed);
    await auditService.log({ module: 'Expense', action: 'CREATE', userId, recordId: id, ip });
    return { expense_category_id: id, category_name: trimmed };
  },

  async updateCategory(id, name, userId, ip) {
    const category = await expenseRepo.findCategoryById(null, id);
    if (!category) throw ApiError.notFound('Category not found');
    const trimmed = String(name || '').trim();
    if (!trimmed) throw ApiError.badRequest('Category name is required');
    if (await expenseRepo.categoryNameTaken(null, trimmed, id)) throw ApiError.conflict('A category with this name already exists');
    await expenseRepo.updateCategory(null, id, trimmed);
    await auditService.log({ module: 'Expense', action: 'UPDATE_CATEGORY', userId, recordId: id, ip });
    return { expense_category_id: id, category_name: trimmed };
  },

  /** Unused categories are deleted; used ones are hidden so past expenses keep their category. */
  async deleteCategory(id, userId, ip) {
    const category = await expenseRepo.findCategoryById(null, id);
    if (!category) throw ApiError.notFound('Category not found');
    const used = await expenseRepo.categoryUsage(null, id);
    if (used > 0) await expenseRepo.deactivateCategory(null, id);
    else await expenseRepo.deleteCategory(null, id);
    await auditService.log({ module: 'Expense', action: 'DELETE_CATEGORY', userId, recordId: id, ip });
    return { expense_category_id: id, deleted: used === 0, hidden: used > 0, used_by: used };
  },

  async addAttachment(id, file, userId, ip) {
    const expense = await expenseRepo.findById(null, id);
    if (!expense) throw ApiError.notFound('Expense not found');
    await expenseRepo.addAttachment(null, id, {
      file_name: file.originalname,
      file_path: file.filename,
      file_type: file.mimetype,
    });
    await auditService.log({ module: 'Expense', action: 'UPLOAD', userId, recordId: id, ip });
    return expenseRepo.attachments(null, id);
  },

  async deleteAttachment(expenseId, attachmentId, userId, ip) {
    const attachment = await expenseRepo.findAttachment(null, attachmentId);
    const expense = await expenseRepo.findById(null, expenseId);
    if (!attachment || !expense || Number(attachment.expense_charge_id) !== Number(expense.expense_charge_id)) {
      throw ApiError.notFound('Attachment not found');
    }
    deleteStoredFile('expenses', attachment.file_path);
    await expenseRepo.deleteAttachment(null, attachmentId);
    await auditService.log({ module: 'Expense', action: 'DELETE_ATTACHMENT', userId, recordId: expenseId, ip });
  },
};

export default expenseService;
