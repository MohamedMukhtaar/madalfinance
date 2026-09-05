import incomeRepo from '../repositories/income.repo.js';
import transactionRepo from '../repositories/transaction.repo.js';
import accountRepo from '../repositories/account.repo.js';
import accountService from './account.service.js';
import trashRepo from '../repositories/trash.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { requireDeleteReason } from '../helpers/deleteReason.js';
import dayjs from 'dayjs';

const resolveAccId = async (conn, data) => {
  let accId = data.acc_id ? Number(data.acc_id) : data.account_id ? Number(data.account_id) : null;
  if (!accId) {
    const def = await accountRepo.findDefault(conn);
    if (def) accId = def.acc_id || def.account_id;
  }
  if (!accId) throw ApiError.badRequest('Account is required. Create an account or set a default account.');
  return accId;
};

export const incomeService = {
  async list(filters) {
    const rows = await incomeRepo.list(null, filters);
    const total = await incomeRepo.count(null, filters);
    return { rows, total };
  },

  async getById(id) {
    const income = await incomeRepo.findById(null, id);
    if (!income) throw ApiError.notFound('Income record not found');
    return income;
  },

  async create(data, userId, ip) {
    return withTransaction(async (conn) => {
      const amount = Number(data.amount);
      if (!amount || amount <= 0) throw ApiError.badRequest('Amount must be greater than zero');

      const accId = await resolveAccId(conn, data);
      const id = await incomeRepo.create(conn, { ...data, amount, acc_id: accId, received_by: userId });

      await transactionRepo.create(conn, {
        transaction_date: data.income_date,
        transaction_type: 'Income',
        reference_type: 'Other Income',
        reference_id: id,
        description: `Other income — ${data.description || data.category_name || 'Other'}`,
        income: amount,
        expense: 0,
        acc_id: accId,
        created_by: userId,
      });

      await accountService.credit(conn, accId, amount);

      await auditService.log({ module: 'Income', action: 'CREATE', userId, recordId: id, ip });
      return incomeRepo.findById(conn, id);
    });
  },

  async update(id, data, userId, ip) {
    return withTransaction(async (conn) => {
      const income = await incomeRepo.findById(conn, id);
      if (!income) throw ApiError.notFound('Income record not found');

      if (data.amount !== undefined && Number(data.amount) !== Number(income.amount)) {
        throw ApiError.badRequest(
          'Amount cannot be changed after recording; delete this record and create a new one'
        );
      }

      await incomeRepo.update(conn, id, { ...data, amount: undefined });
      await auditService.log({ module: 'Income', action: 'UPDATE', userId, recordId: id, ip });
      return incomeRepo.findById(conn, id);
    });
  },

  async remove(id, reason, userId, ip) {
    const deleteReason = requireDeleteReason(reason);
    return withTransaction(async (conn) => {
      const income = await incomeRepo.findById(conn, id);
      if (!income) throw ApiError.notFound('Income record not found');

      const accId = income.acc_id || income.account_id;
      await incomeRepo.softDelete(conn, id, { reason: deleteReason, deletedBy: userId });
      await trashRepo.add(conn, {
        entity_type: 'income',
        entity_id: id,
        entity_label: income.description || `Income #${id}`,
        delete_reason: deleteReason,
        deleted_by: userId,
      });

      await transactionRepo.create(conn, {
        transaction_date: dayjs().format('YYYY-MM-DD'),
        transaction_type: 'Expense',
        reference_type: 'Other Income',
        reference_id: id,
        description: `Reversal of income ${income.income_id} (${income.description || ''})`,
        income: 0,
        expense: Number(income.amount),
        acc_id: accId,
        created_by: userId,
      });

      if (accId) {
        await accountService.debit(conn, accId, Number(income.amount));
      }

      await auditService.log({ module: 'Income', action: 'DELETE', userId, recordId: id, ip, details: deleteReason });
      return { income_id: id, deleted: true };
    });
  },

  async categories() {
    return incomeRepo.categories(null);
  },
};

export default incomeService;
