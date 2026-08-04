import invoiceService from '../services/invoice.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const list = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['invoice_id', 'invoice_number', 'invoice_date', 'due_date', 'total_amount', 'paid_amount', 'status', 'created_at'],
  });
  const { rows, total } = await invoiceService.list({
    search: q.search,
    status: req.query.status || '',
    customerId: req.query.customer_id || '',
    fromDate: req.query.from_date || '',
    toDate: req.query.to_date || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Invoices fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const getById = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getById(Number(req.params.id));
  return ApiResponse.success(res, invoice, 'Invoice fetched');
});

export const create = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.create(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, invoice, 'Invoice created', 201);
});

export const update = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.update(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, invoice, 'Invoice updated');
});

export const setStatus = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.setStatus(Number(req.params.id), req.body.status, req.user.id, req.ip);
  return ApiResponse.success(res, invoice, 'Invoice status updated');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await invoiceService.remove(Number(req.params.id), req.body?.reason, req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Invoice deleted');
});

export const generatePdf = asyncHandler(async (req, res) => {
  const { filename, filePath } = await invoiceService.generatePdf(Number(req.params.id));
  res.download(filePath, filename);
});

export const addAttachment = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const attachments = await invoiceService.addAttachment(Number(req.params.id), req.file, req.user.id, req.ip);
  return ApiResponse.success(res, attachments, 'Attachment uploaded');
});

export const deleteAttachment = asyncHandler(async (req, res) => {
  await invoiceService.deleteAttachment(Number(req.params.id), Number(req.params.attachmentId), req.user.id, req.ip);
  return ApiResponse.success(res, null, 'Attachment deleted');
});

export default { list, getById, create, update, setStatus, remove, generatePdf, addAttachment, deleteAttachment };
