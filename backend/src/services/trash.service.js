import dayjs from 'dayjs';
import trashRepo from '../repositories/trash.repo.js';
import customerRepo from '../repositories/customer.repo.js';
import projectRepo from '../repositories/project.repo.js';
import contractRepo from '../repositories/contract.repo.js';
import invoiceRepo from '../repositories/invoice.repo.js';
import paymentRepo from '../repositories/payment.repo.js';
import expenseRepo from '../repositories/expense.repo.js';
import incomeRepo from '../repositories/income.repo.js';
import memberRepo from '../repositories/member.repo.js';
import userRepo from '../repositories/user.repo.js';
import transactionRepo from '../repositories/transaction.repo.js';
import accountService from './account.service.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';

const RESTORE_MAP = {
  customer: {
    restore: (conn, id) => customerRepo.restore(conn, id),
  },
  project: {
    restore: (conn, id) => projectRepo.restore(conn, id),
  },
  contract: {
    restore: (conn, id) => contractRepo.restore(conn, id),
  },
  invoice: {
    restore: (conn, id) => invoiceRepo.restore(conn, id),
  },
  payment: {
    restore: async (conn, id, userId) => {
      const payment = await paymentRepo.findByIdIncludingDeleted(conn, id);
      if (!payment) throw ApiError.notFound('Payment not found');

      const allocs = await paymentRepo.allocations(conn, id);
      for (const alloc of allocs) {
        const invoice = await invoiceRepo.findById(conn, alloc.invoice_id);
        if (!invoice) continue;
        const newPaid = Number(invoice.paid_amount) + Number(alloc.amount_allocated);
        const total = Number(invoice.total_amount);
        let status = 'Partial';
        if (newPaid >= total - 0.001) status = 'Paid';
        else if (newPaid <= 0) status = 'Issued';
        await invoiceRepo.applyPaidAmount(conn, alloc.invoice_id, Math.min(newPaid, total), status);
      }

      await paymentRepo.restore(conn, id);
      await transactionRepo.create(conn, {
        transaction_date: dayjs().format('YYYY-MM-DD'),
        transaction_type: 'Income',
        reference_type: 'Payment',
        reference_id: id,
        description: `Restored payment ${payment.payment_number}`,
        income: Number(payment.amount),
        expense: 0,
        created_by: userId,
      });
    },
  },
  expense: {
    restore: async (conn, id, userId) => {
      const expense = await expenseRepo.findByIdIncludingDeleted(conn, id);
      if (!expense) throw ApiError.notFound('Expense not found');
      await expenseRepo.restore(conn, id);
      await transactionRepo.create(conn, {
        transaction_date: dayjs().format('YYYY-MM-DD'),
        transaction_type: 'Expense',
        reference_type: 'Expense',
        reference_id: id,
        description: `Restored expense ${expense.expense_id} (${expense.description || ''})`,
        income: 0,
        expense: Number(expense.amount),
        created_by: userId,
      });
    },
  },
  income: {
    restore: async (conn, id, userId) => {
      const income = await incomeRepo.findByIdIncludingDeleted(conn, id);
      if (!income) throw ApiError.notFound('Income record not found');
      const accId = income.acc_id || income.account_id;
      await incomeRepo.restore(conn, id);
      await transactionRepo.create(conn, {
        transaction_date: dayjs().format('YYYY-MM-DD'),
        transaction_type: 'Income',
        reference_type: 'Other Income',
        reference_id: id,
        description: `Restored income ${income.income_id} (${income.description || ''})`,
        income: Number(income.amount),
        expense: 0,
        acc_id: accId,
        created_by: userId,
      });
      if (accId) {
        await accountService.credit(conn, accId, Number(income.amount));
      }
    },
  },
  member: {
    restore: async (conn, id) => {
      await memberRepo.restore(conn, id);
    },
  },
  user: {
    restore: async (conn, id) => {
      await userRepo.restore(conn, id);
    },
  },
};

export const trashService = {
  async list(filters) {
    const rows = await trashRepo.list(null, filters);
    const total = await trashRepo.count(null, filters);
    return { rows, total };
  },

  async restore(trashId, userId, ip) {
    return withTransaction(async (conn) => {
      const item = await trashRepo.findById(conn, trashId);
      if (!item) throw ApiError.notFound('Trash item not found');

      const handler = RESTORE_MAP[item.entity_type];
      if (!handler) throw ApiError.badRequest(`Unknown entity type: ${item.entity_type}`);

      await handler.restore(conn, item.entity_id, userId);
      await trashRepo.remove(conn, item.entity_type, item.entity_id);

      await auditService.log({
        module: 'Trash',
        action: 'RESTORE',
        userId,
        recordId: item.entity_id,
        ip,
        details: `${item.entity_type}: ${item.entity_label}`,
      });

      return {
        trash_id: trashId,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
      };
    });
  },
};

export default trashService;
