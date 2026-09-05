import salaryService from '../services/salary.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const listCharges = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['salary_charge_id', 'salary_period', 'charge_date', 'net_salary', 'status', 'created_at'],
    defaultSort: 'salary_period:desc',
  });
  const { rows, total } = await salaryService.listCharges({
    search: q.search,
    status: req.query.status || '',
    employeeId: req.query.employee_id || '',
    year: req.query.year || '',
    month: req.query.month || '',
    salary_period: req.query.salary_period || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Salary charges fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const getCharge = asyncHandler(async (req, res) => {
  const charge = await salaryService.getCharge(Number(req.params.id));
  return ApiResponse.success(res, charge, 'Salary charge fetched');
});

export const createCharge = asyncHandler(async (req, res) => {
  const charge = await salaryService.createCharge(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, charge, 'Salary charge created', 201);
});

export const generateCharges = asyncHandler(async (req, res) => {
  const result = await salaryService.generate(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Salary charges generated', 201);
});

export const removeCharge = asyncHandler(async (req, res) => {
  const result = await salaryService.removeCharge(Number(req.params.id), req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Salary charge deleted');
});

export const payCharge = asyncHandler(async (req, res) => {
  const payment = await salaryService.pay(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, payment, 'Salary payment recorded', 201);
});

export const listPayments = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['salary_payment_id', 'payment_date', 'amount', 'created_at'],
    defaultSort: 'payment_date:desc',
  });
  const { rows, total } = await salaryService.listPayments({
    search: q.search,
    employeeId: req.query.employee_id || '',
    fromDate: req.query.from_date || '',
    toDate: req.query.to_date || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Salary payments fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export default {
  listCharges,
  getCharge,
  createCharge,
  generateCharges,
  removeCharge,
  payCharge,
  listPayments,
};
