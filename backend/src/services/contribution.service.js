import contributionRepo from '../repositories/contribution.repo.js';
import settingsRepo from '../repositories/settings.repo.js';
import transactionRepo from '../repositories/transaction.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { deleteStoredFile } from '../helpers/fileHelper.js';

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

  async receiveDue(dueId, amount, paidDate, userId, ip) {
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

      const newPaid = Number(due.paid_amount) + payAmount;
      const status = newPaid >= Number(due.amount) - 0.001 ? 'Paid' : 'Partial';
      await contributionRepo.applyDuePayment(conn, dueId, newPaid, status, paidDate ?? new Date());

      const member = await contributionRepo
        .activeMembers(conn)
        .then((m) => m.find((x) => x.member_id === due.member_id));

      await transactionRepo.create(conn, {
        transaction_date: paidDate ?? new Date(),
        transaction_type: 'Income',
        reference_type: 'Member Due',
        reference_id: dueId,
        description: `Member contribution ${due.month}/${due.year} — ${member?.member_name || `member ${due.member_id}`}`,
        income: payAmount,
        expense: 0,
        created_by: userId,
      });

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
};

export default contributionService;
