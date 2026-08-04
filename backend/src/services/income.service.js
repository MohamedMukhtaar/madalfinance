import incomeRepo from '../repositories/income.repo.js';
import transactionRepo from '../repositories/transaction.repo.js';
import trashRepo from '../repositories/trash.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { requireDeleteReason } from '../helpers/deleteReason.js';
import dayjs from 'dayjs';

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

      const id = await incomeRepo.create(conn, { ...data, amount, received_by: userId });

      await transactionRepo.create(conn, {
        transaction_date: data.income_date,
        transaction_type: 'Income',
        reference_type: 'Other Income',
        reference_id: id,
        description: `Other income — ${data.description || `category ${data.income_category_id}`}`,
        income: amount,
        expense: 0,
        created_by: userId,
      });

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
        created_by: userId,
      });

      await auditService.log({ module: 'Income', action: 'DELETE', userId, recordId: id, ip });
      return { income_id: id, deleted: true };
    });
  },

  async categories() {
    return incomeRepo.categories(null);
  },

  async createCategory(name, userId, ip) {
    const id = await incomeRepo.createCategory(null, name);
    await auditService.log({ module: 'Income', action: 'CREATE', userId, recordId: id, ip });
    return { income_category_id: id, category_name: name };
  },
};

export default incomeService;
