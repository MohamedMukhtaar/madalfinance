import contributionRepo from '../repositories/contribution.repo.js';
import settingsRepo from '../repositories/settings.repo.js';
import transactionRepo from '../repositories/transaction.repo.js';
import accountRepo from '../repositories/account.repo.js';
import accountService from './account.service.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { deleteStoredFile } from '../helpers/fileHelper.js';
import dayjs from 'dayjs';

export const contributionService = {
  async listBatches(filters) {
    const rows = await contributionRepo.listBatches(null, filters);
    const total = await contributionRepo.countBatches(null);
    return { rows, total };
  },

  async getBatch(batchId) {
    const batch = await contributionRepo.findBatch(null, batchId);
    if (!batch) throw ApiError.notFound('Due batch not found');
    const rows = await contributionRepo.listDues(null, {
      batchId,
      status: '',
      memberId: '',
      offset: 0,
      perPage: 10000,
      order: 'member_name ASC',
    });
    return { ...batch, dues: rows };
  },

  async listDues(filters) {
    const rows = await contributionRepo.listDues(null, filters);
    const total = await contributionRepo.countDues(null, filters);
    return { rows, total };
  },

  async activeMembers() {
    return contributionRepo.activeMembers(null);
  },

  async generateBatch(data, userId, ip) {
    return withTransaction(async (conn) => {
      const month = Number(data.month);
      const year = Number(data.year);
      if (month < 1 || month > 12) throw ApiError.badRequest('Invalid month');

      const existing = await contributionRepo.findBatchByMonth(conn, month, year);
      if (existing) throw ApiError.conflict('A due batch already exists for this month');

      let defaultAmount = Number(data.default_amount);
      if (!defaultAmount) {
        const settings = await settingsRepo.get(conn);
        defaultAmount = Number(settings?.default_member_due) || 0;
      }
      if (defaultAmount <= 0) throw ApiError.badRequest('Provide a due amount');

      const members = await contributionRepo.activeMembers(conn);
      if (!members.length) throw ApiError.badRequest('No active members to bill');

      const batchId = await contributionRepo.createBatch(conn, {
        month,
        year,
        default_amount: defaultAmount,
        generated_date: new Date(),
        generated_by: userId,
      });

      for (const member of members) {
        await contributionRepo.createDue(conn, {
          batch_id: batchId,
          member_id: member.member_id,
          amount: defaultAmount,
        });
      }

      await auditService.log({ module: 'Contribution', action: 'GENERATE', userId, recordId: batchId, ip });
      return contributionRepo.findBatch(conn, batchId);
    });
  },

  async receiveDue(dueId, amount, paidDate, accId, userId, ip) {
    return withTransaction(async (conn) => {
      const due = await contributionRepo.dueById(conn, dueId);
      if (!due) throw ApiError.notFound('Member due not found');
      if (due.status === 'Paid') throw ApiError.conflict('This due is already fully paid');

      const payAmount = Number(amount);
      if (payAmount <= 0) throw ApiError.badRequest('Amount must be greater than zero');
      const remaining = Number(due.amount) - Number(due.paid_amount);
      if (payAmount > remaining + 0.01) {
        throw ApiError.badRequest(`Amount exceeds the outstanding balance of ${remaining.toFixed(2)}`);
      }

      let resolvedAccId = accId ? Number(accId) : null;
      if (!resolvedAccId) {
        const def = await accountRepo.findDefault(conn);
        if (def) resolvedAccId = def.acc_id;
      }
      if (!resolvedAccId) {
        throw ApiError.badRequest('Account is required. Create an account or set a default account.');
      }

      const paidOn = paidDate ?? new Date();
      const newPaid = Number(due.paid_amount) + payAmount;
      const status = newPaid >= Number(due.amount) - 0.001 ? 'Paid' : 'Partial';
      await contributionRepo.applyDuePayment(conn, dueId, newPaid, status, paidOn);

      await contributionRepo.createDuePayment(conn, {
        due_id: dueId,
        amount: payAmount,
        acc_id: resolvedAccId,
        paid_date: paidOn,
        created_by: userId,
      });

      const period =
        due.month && due.year
          ? dayjs(`${due.year}-${String(due.month).padStart(2, '0')}-01`).format('MMMM YYYY')
          : 'contribution';

      await transactionRepo.create(conn, {
        transaction_date: paidOn,
        transaction_type: 'Income',
        reference_type: 'Member Due',
        reference_id: dueId,
        description: `Member contribution ${period} — ${due.member_name || `member ${due.member_id}`}`,
        income: payAmount,
        expense: 0,
        created_by: userId,
      });

      await accountService.credit(conn, resolvedAccId, payAmount);

      await auditService.log({ module: 'Contribution', action: 'PAYMENT', userId, recordId: dueId, ip });
      return contributionRepo.dueById(conn, dueId);
    });
  },

  async listAttachments(dueId) {
    const due = await contributionRepo.dueById(null, dueId);
    if (!due) throw ApiError.notFound('Member due not found');
    return contributionRepo.attachments(null, dueId);
  },

  async addAttachment(dueId, file, userId, ip) {
    const due = await contributionRepo.dueById(null, dueId);
    if (!due) throw ApiError.notFound('Member due not found');
    await contributionRepo.addAttachment(null, dueId, {
      file_name: file.originalname,
      file_path: file.filename,
      file_type: file.mimetype,
      uploaded_by: userId,
    });
    await auditService.log({ module: 'Contribution', action: 'UPLOAD', userId, recordId: dueId, ip });
    return contributionRepo.attachments(null, dueId);
  },

  async deleteAttachment(dueId, attachmentId, userId, ip) {
    const attachment = await contributionRepo.findAttachment(null, attachmentId);
    if (!attachment || Number(attachment.due_id) !== Number(dueId)) {
      throw ApiError.notFound('Attachment not found');
    }
    deleteStoredFile('contributions', attachment.file_path);
    await contributionRepo.deleteAttachment(null, attachmentId);
    await auditService.log({
      module: 'Contribution',
      action: 'DELETE_ATTACHMENT',
      userId,
      recordId: dueId,
      ip,
    });
  },

  async grantCredit(memberId, data, userId, ip) {
    return this.grantLoan(memberId, data, userId, ip);
  },

  /** Lend cash to a member — increases their loan balance (they owe the company). */
  async grantLoan(memberId, data, userId, ip) {
    return withTransaction(async (conn) => {
      const amount = Number(data.amount);
      if (!amount || amount <= 0) throw ApiError.badRequest('Loan amount must be greater than zero');

      const members = await contributionRepo.activeMembers(conn);
      const member = members.find((m) => m.member_id === Number(memberId));
      if (!member) throw ApiError.notFound('Member not found');

      let accId = data.acc_id ? Number(data.acc_id) : null;
      if (!accId) {
        const def = await accountRepo.findDefault(conn);
        if (def) accId = def.acc_id;
      }
      if (!accId) throw ApiError.badRequest('Account is required. Select the account to lend from.');

      const loanDate = data.credit_date ?? data.loan_date ?? dayjs().format('YYYY-MM-DD');
      const description = data.notes?.trim() || `Member loan — ${member.member_name}`;

      const loanId = await contributionRepo.addCreditLedger(conn, {
        member_id: memberId,
        amount,
        description,
        credit_date: loanDate,
        due_id: null,
        acc_id: accId,
        created_by: userId,
      });

      await accountService.debit(conn, accId, amount);

      await transactionRepo.create(conn, {
        transaction_date: loanDate,
        transaction_type: 'Loan',
        reference_type: 'Member Loan',
        reference_id: loanId,
        description: `Member loan to ${member.member_name}`,
        income: 0,
        expense: amount,
        created_by: userId,
      });

      await contributionRepo.adjustMemberCredit(conn, memberId, amount);

      await auditService.log({ module: 'Contribution', action: 'LOAN', userId, recordId: memberId, ip });
      const loanBalance = await contributionRepo.getMemberCreditBalance(conn, memberId);
      return { member_id: memberId, loan_id: loanId, loan_balance: loanBalance, credit_balance: loanBalance };
    });
  },

  /** Member repays part or all of an outstanding loan. */
  async repayLoan(memberId, data, userId, ip) {
    return withTransaction(async (conn) => {
      const amount = Number(data.amount);
      if (!amount || amount <= 0) throw ApiError.badRequest('Repayment amount must be greater than zero');

      const members = await contributionRepo.activeMembers(conn);
      const member = members.find((m) => m.member_id === Number(memberId));
      if (!member) throw ApiError.notFound('Member not found');

      const loanBalance = await contributionRepo.getMemberCreditBalance(conn, memberId);
      if (loanBalance <= 0) throw ApiError.badRequest('Member has no outstanding loan balance');
      if (amount > loanBalance + 0.01) {
        throw ApiError.badRequest(`Amount exceeds outstanding loan (${loanBalance.toFixed(2)})`);
      }

      let accId = data.acc_id ? Number(data.acc_id) : null;
      if (!accId) {
        const def = await accountRepo.findDefault(conn);
        if (def) accId = def.acc_id;
      }
      if (!accId) throw ApiError.badRequest('Account is required. Select the account to deposit into.');

      const repayDate = data.repay_date ?? data.credit_date ?? dayjs().format('YYYY-MM-DD');
      const description = data.notes?.trim() || `Loan repayment — ${member.member_name}`;

      const entryId = await contributionRepo.addCreditLedger(conn, {
        member_id: memberId,
        amount: -amount,
        description,
        credit_date: repayDate,
        due_id: null,
        acc_id: accId,
        created_by: userId,
      });

      await accountService.credit(conn, accId, amount);

      await transactionRepo.create(conn, {
        transaction_date: repayDate,
        transaction_type: 'Loan',
        reference_type: 'Member Loan Repayment',
        reference_id: entryId,
        description: `Loan repayment from ${member.member_name}`,
        income: amount,
        expense: 0,
        created_by: userId,
      });

      await contributionRepo.adjustMemberCredit(conn, memberId, -amount);

      await auditService.log({ module: 'Contribution', action: 'LOAN_REPAY', userId, recordId: memberId, ip });
      const balance = await contributionRepo.getMemberCreditBalance(conn, memberId);
      return { member_id: memberId, entry_id: entryId, loan_balance: balance, credit_balance: balance };
    });
  },

  async applyCreditToDue(dueId, amount, userId, ip) {
    throw ApiError.badRequest('Apply credit is no longer supported. Record a loan repayment instead.');
  },
};

export default contributionService;
