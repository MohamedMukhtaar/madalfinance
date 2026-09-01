import paymentService from '../services/payment.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const list = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['payment_id', 'payment_number', 'payment_date', 'payment_method', 'amount', 'created_at'],
    defaultSort: 'created_at:desc',
  });
  const { rows, total } = await paymentService.list({
    search: q.search,
    customerId: req.query.customer_id || '',
    method: req.query.method || '',
    fromDate: req.query.from_date || '',
    toDate: req.query.to_date || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Payments fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const getById = asyncHandler(async (req, res) => {
  const payment = await paymentService.getById(Number(req.params.id));
  return ApiResponse.success(res, payment, 'Payment fetched');
});

export const create = asyncHandler(async (req, res) => {
  const payment = await paymentService.create(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, payment, 'Payment recorded', 201);
});

export const update = asyncHandler(async (req, res) => {
  const payment = await paymentService.update(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, payment, 'Payment updated');
});

export const voidPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.void(Number(req.params.id), req.body?.reason, req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Payment voided');
});

export const addAttachment = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const attachments = await paymentService.addAttachment(Number(req.params.id), req.file, req.user.id, req.ip);
  return ApiResponse.success(res, attachments, 'Receipt uploaded');
});

export const deleteAttachment = asyncHandler(async (req, res) => {
  await paymentService.deleteAttachment(Number(req.params.id), Number(req.params.attachmentId), req.user.id, req.ip);
  return ApiResponse.success(res, null, 'Receipt deleted');
});

export const generatePdf = asyncHandler(async (req, res) => {
  const { filename, filePath } = await paymentService.generatePdf(Number(req.params.id));
  res.download(filePath, filename);
});

export default { list, getById, create, update, voidPayment, addAttachment, deleteAttachment, generatePdf };
