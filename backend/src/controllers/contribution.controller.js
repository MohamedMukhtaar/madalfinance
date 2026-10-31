import contributionService from '../services/contribution.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const listBatches = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: [
      'batch_id',
      'month',
      'year',
      'default_amount',
      'generated_date',
      'total_dues',
      'expected_amount',
      'collected_amount',
    ],
    defaultSort: 'batch_id:desc',
  });
  const { rows, total } = await contributionService.listBatches({
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Due batches fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const getBatch = asyncHandler(async (req, res) => {
  const batch = await contributionService.getBatch(Number(req.params.id));
  return ApiResponse.success(res, batch, 'Due batch fetched');
});

export const generateBatch = asyncHandler(async (req, res) => {
  const batch = await contributionService.generateBatch(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, batch, 'Due batch generated', 201);
});

export const listDues = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['due_id', 'member_name', 'amount', 'paid_amount', 'status', 'paid_date', 'charge_date'],
    defaultSort: 'charge_date:desc',
  });
  // The contributions page shows every charge at once, so allow a bigger page than the default cap.
  const perPage = Math.min(1000, Math.max(1, parseInt(req.query.per_page, 10) || q.perPage));
  const offset = (q.page - 1) * perPage;
  const { rows, total } = await contributionService.listDues({
    batchId: req.query.batch_id || '',
    status: req.query.status || '',
    memberId: req.query.member_id || '',
    month: Number(req.query.month) || null,
    year: Number(req.query.year) || null,
    offset,
    perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Member dues fetched', 200, paginationMeta(q.page, perPage, total));
});

export const periods = asyncHandler(async (_req, res) => {
  const rows = await contributionService.chargePeriods();
  return ApiResponse.success(res, rows, 'Charge periods fetched');
});

export const updateBatch = asyncHandler(async (req, res) => {
  const batch = await contributionService.updateBatch(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, batch, 'Charge updated');
});

export const deleteBatch = asyncHandler(async (req, res) => {
  const result = await contributionService.deleteBatch(Number(req.params.id), req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Charge deleted');
});

export const updateDue = asyncHandler(async (req, res) => {
  const due = await contributionService.updateDue(Number(req.params.id), req.body.amount, req.user.id, req.ip);
  return ApiResponse.success(res, due, 'Due updated');
});

export const deleteDue = asyncHandler(async (req, res) => {
  const result = await contributionService.deleteDue(Number(req.params.id), req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Due deleted');
});

export const receiveDue = asyncHandler(async (req, res) => {
  const due = await contributionService.receiveDue(
    Number(req.params.id),
    req.body.amount,
    req.body.paid_date,
    req.body.acc_id,
    req.user.id,
    req.ip
  );
  return ApiResponse.success(res, due, 'Due payment recorded');
});

export const members = asyncHandler(async (req, res) => {
  const membersList = await contributionService.activeMembers();
  return ApiResponse.success(res, membersList, 'Members fetched');
});

export const listAttachments = asyncHandler(async (req, res) => {
  const rows = await contributionService.listAttachments(Number(req.params.id));
  return ApiResponse.success(res, rows, 'Contribution attachments fetched');
});

export const addAttachment = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const attachments = await contributionService.addAttachment(
    Number(req.params.id),
    req.file,
    req.user.id,
    req.ip
  );
  return ApiResponse.success(res, attachments, 'Receipt uploaded', 201);
});

export const deleteAttachment = asyncHandler(async (req, res) => {
  await contributionService.deleteAttachment(
    Number(req.params.id),
    Number(req.params.attachmentId),
    req.user.id,
    req.ip
  );
  return ApiResponse.success(res, null, 'Receipt deleted');
});

export const grantCredit = asyncHandler(async (req, res) => {
  const result = await contributionService.grantLoan(
    Number(req.params.memberId),
    req.body,
    req.user.id,
    req.ip
  );
  return ApiResponse.success(res, result, 'Member loan recorded', 201);
});

export const repayLoan = asyncHandler(async (req, res) => {
  const result = await contributionService.repayLoan(
    Number(req.params.memberId),
    req.body,
    req.user.id,
    req.ip
  );
  return ApiResponse.success(res, result, 'Loan repayment recorded');
});

export const applyCredit = asyncHandler(async (req, res) => {
  const due = await contributionService.applyCreditToDue(
    Number(req.params.id),
    req.body.amount,
    req.user.id,
    req.ip
  );
  return ApiResponse.success(res, due, 'Member credit applied');
});

export default {
  periods,
  updateBatch,
  deleteBatch,
  updateDue,
  deleteDue,
  listBatches,
  getBatch,
  generateBatch,
  listDues,
  receiveDue,
  members,
  listAttachments,
  addAttachment,
  deleteAttachment,
  grantCredit,
  repayLoan,
  applyCredit,
};
