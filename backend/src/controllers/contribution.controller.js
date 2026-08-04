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
    allowedSorts: ['due_id', 'member_name', 'amount', 'paid_amount', 'status', 'paid_date'],
    defaultSort: 'member_name:asc',
  });
  const { rows, total } = await contributionService.listDues({
    batchId: req.query.batch_id || '',
    status: req.query.status || '',
    memberId: req.query.member_id || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Member dues fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const receiveDue = asyncHandler(async (req, res) => {
  const due = await contributionService.receiveDue(
    Number(req.params.id),
    req.body.amount,
    req.body.paid_date,
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

export default {
  listBatches,
  getBatch,
  generateBatch,
  listDues,
  receiveDue,
  members,
  listAttachments,
  addAttachment,
  deleteAttachment,
};
