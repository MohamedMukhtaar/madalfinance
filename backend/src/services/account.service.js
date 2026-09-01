import accountRepo from '../repositories/account.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';

export const accountService = {
  async list() {
    return accountRepo.list(null);
  },

  async getById(id) {
    const account = await accountRepo.findById(null, id);
    if (!account) throw ApiError.notFound('Account not found');
    return account;
  },

  async getDefault() {
    return accountRepo.findDefault(null);
  },

  async create(data, userId, ip) {
    return withTransaction(async (conn) => {
      const existing = await accountRepo.list(conn);
      const isFirst = existing.length === 0;
      const isDefault = data.is_default || isFirst;

      if (isDefault) await accountRepo.clearDefault(conn);

      const id = await accountRepo.create(conn, {
        number: data.number,
        institution: data.institution,
        balance: Number(data.balance ?? 0),
        is_default: isDefault,
      });

      await auditService.log({ module: 'Account', action: 'CREATE', userId, recordId: id, ip });
      return accountRepo.findById(conn, id);
    });
  },

  async update(id, data, userId, ip) {
    return withTransaction(async (conn) => {
      const account = await accountRepo.findById(conn, id);
      if (!account) throw ApiError.notFound('Account not found');
      await accountRepo.update(conn, id, data);
      await auditService.log({ module: 'Account', action: 'UPDATE', userId, recordId: id, ip });
      return accountRepo.findById(conn, id);
    });
  },

  async setDefault(id, userId, ip) {
    return withTransaction(async (conn) => {
      const account = await accountRepo.findById(conn, id);
      if (!account) throw ApiError.notFound('Account not found');
      await accountRepo.clearDefault(conn);
      await accountRepo.setDefault(conn, id);
      await auditService.log({ module: 'Account', action: 'SET_DEFAULT', userId, recordId: id, ip });
      return accountRepo.findById(conn, id);
    });
  },

  async transfer(data, userId, ip) {
    return withTransaction(async (conn) => {
      const fromId = Number(data.from_acc_id);
      const toId = Number(data.to_acc_id);
      const amount = Number(data.amount);

      if (fromId === toId) throw ApiError.badRequest('Cannot transfer to the same account');
      if (!amount || amount <= 0) throw ApiError.badRequest('Transfer amount must be greater than zero');

      const from = await accountRepo.findById(conn, fromId);
      const to = await accountRepo.findById(conn, toId);
      if (!from) throw ApiError.notFound('Source account not found');
      if (!to) throw ApiError.notFound('Destination account not found');

      if (Number(from.balance) < amount - 0.001) {
        throw ApiError.badRequest('Insufficient balance in source account');
      }

      await accountRepo.adjustBalance(conn, fromId, -amount);
      await accountRepo.adjustBalance(conn, toId, amount);

      const transferId = await accountRepo.createTransfer(conn, {
        from_acc_id: fromId,
        to_acc_id: toId,
        amount,
        transfer_date: data.transfer_date,
        notes: data.notes ?? null,
        created_by: userId,
      });

      await auditService.log({ module: 'Account', action: 'TRANSFER', userId, recordId: transferId, ip });
      return { transfer_id: transferId };
    });
  },

  async listTransfers(filters) {
    return accountRepo.listTransfers(null, filters);
  },

  async statement(accId, filters) {
    const account = await accountRepo.findById(null, accId);
    if (!account) throw ApiError.notFound('Account not found');
    const { movements, total, openingBalance } = await accountRepo.statement(null, accId, filters);
    return { account, movements, total, openingBalance };
  },

  /**
   * Record a cash receipt (payment received, contribution, etc.).
   * Increases account balance — standard accounting DEBIT on cash account.
   */
  async credit(conn, accId, amount) {
    if (!accId) return;
    const account = await accountRepo.findById(conn, accId);
    if (!account) throw ApiError.notFound('Account not found');
    await accountRepo.adjustBalance(conn, accId, amount);
  },

  /**
   * Record a cash payment (expense, member payout, transfer out, etc.).
   * Decreases account balance — standard accounting CREDIT on cash account.
   */
  async debit(conn, accId, amount) {
    if (!accId) return;
    const account = await accountRepo.findById(conn, accId);
    if (!account) throw ApiError.notFound('Account not found');
    if (Number(account.balance) < amount - 0.001) {
      throw ApiError.badRequest(`Insufficient balance in account ${account.institution}`);
    }
    await accountRepo.adjustBalance(conn, accId, -amount);
  },
};

export default accountService;
