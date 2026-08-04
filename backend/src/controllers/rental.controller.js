import rentalService from '../services/rental.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const list = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['billing_id', 'monthly_amount', 'next_billing_date', 'last_generated', 'status', 'project_name', 'customer_name'],
    defaultSort: 'next_billing_date:asc',
  });
  const { rows, total } = await rentalService.list({
    status: req.query.status || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Rental billings fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const getById = asyncHandler(async (req, res) => {
  const billing = await rentalService.getById(Number(req.params.id));
  return ApiResponse.success(res, billing, 'Rental billing fetched');
});

export const create = asyncHandler(async (req, res) => {
  const billing = await rentalService.create(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, billing, 'Rental billing created', 201);
});

export const update = asyncHandler(async (req, res) => {
  const billing = await rentalService.update(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, billing, 'Rental billing updated');
});

export const setStatus = asyncHandler(async (req, res) => {
  const billing = await rentalService.setStatus(Number(req.params.id), req.body.status, req.user.id, req.ip);
  return ApiResponse.success(res, billing, 'Rental status updated');
});

export const generateInvoice = asyncHandler(async (req, res) => {
  const force = req.body?.force === true || req.query.force === 'true' || req.query.force === '1';
  const invoice = await rentalService.generateMonthlyInvoice(Number(req.params.id), req.user.id, { force });
  return ApiResponse.success(res, invoice, 'Rental invoice generated', 201);
});

export const chargeAll = asyncHandler(async (req, res) => {
  const force = req.body?.force === true || req.query.force === 'true' || req.query.force === '1';
  const result = await rentalService.processDueBillings(req.user.id, { force });
  return ApiResponse.success(res, result, 'Rental invoices processed');
});

export default { list, getById, create, update, setStatus, generateInvoice, chargeAll };
