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

      let accId = data.acc_id ? Number(data.acc_id) : null;
      if (!accId) {
        const def = await accountRepo.findDefault(conn);
        if (def) accId = def.acc_id;
      }
      if (!accId) throw ApiError.badRequest('Account is required. Create an account or set a default account.');

      const id = await expenseRepo.create(conn, { ...data, amount, acc_id: accId, created_by: userId });

      await transactionRepo.create(conn, {
        transaction_date: data.expense_date,
        transaction_type: 'Expense',
        reference_type: 'Expense',
        reference_id: id,
        description: `Expense — ${data.description || expenseCategoryName(data.category_id)}`,
        income: 0,
        expense: amount,
        created_by: userId,
      });

      await accountService.debit(conn, accId, amount);

      await auditService.log({ module: 'Expense', action: 'CREATE', userId, recordId: id, ip });
      return expenseRepo.findById(conn, id);
    });
  },

  async update(id, data, userId, ip) {
    return withTransaction(async (conn) => {
      const expense = await expenseRepo.findById(conn, id);
      if (!expense) throw ApiError.notFound('Expense not found');

      if (data.amount !== undefined && Number(data.amount) !== Number(expense.amount)) {
        throw ApiError.badRequest(
          'Expense amount cannot be changed after recording; delete this expense and create a new one'
        );
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

      // Reversing entry keeps the ledger balance correct.
      await transactionRepo.create(conn, {
        transaction_date: dayjs().format('YYYY-MM-DD'),
        transaction_type: 'Income',
        reference_type: 'Expense',
        reference_id: id,
        description: `Reversal of expense ${expense.expense_id} (${expense.description || ''})`,
        income: Number(expense.amount),
        expense: 0,
        created_by: userId,
      });

      if (expense.acc_id) {
        await accountService.credit(conn, expense.acc_id, Number(expense.amount));
      }

      await auditService.log({ module: 'Expense', action: 'DELETE', userId, recordId: id, ip, details: deleteReason });
      return { expense_id: id, deleted: true };
    });
  },

  async categories() {
    return expenseRepo.categories(null);
  },

  async createCategory(name, userId, ip) {
    const id = await expenseRepo.createCategory(null, name);
    await auditService.log({ module: 'Expense', action: 'CREATE', userId, recordId: id, ip });
    return { expense_category_id: id, category_name: name };
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
    if (!attachment || attachment.expense_id !== Number(expenseId)) {
      throw ApiError.notFound('Attachment not found');
    }
    deleteStoredFile('expenses', attachment.file_path);
    await expenseRepo.deleteAttachment(null, attachmentId);
    await auditService.log({ module: 'Expense', action: 'DELETE_ATTACHMENT', userId, recordId: expenseId, ip });
  },
};

function expenseCategoryName(categoryId) {
  return `category ${categoryId}`;
}

export default expenseService;
