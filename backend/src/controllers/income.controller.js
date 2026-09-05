import incomeService from '../services/income.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const list = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['income_id', 'income_date', 'amount', 'category_name'],
    defaultSort: 'income_date:desc',
  });
  const { rows, total } = await incomeService.list({
    search: q.search,
    categoryId: req.query.category_id || '',
    fromDate: req.query.from_date || '',
    toDate: req.query.to_date || '',
    accId: req.query.acc_id || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Income records fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const getById = asyncHandler(async (req, res) => {
  const income = await incomeService.getById(Number(req.params.id));
  return ApiResponse.success(res, income, 'Income record fetched');
});

export const create = asyncHandler(async (req, res) => {
  const income = await incomeService.create(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, income, 'Income recorded', 201);
});

export const update = asyncHandler(async (req, res) => {
  const income = await incomeService.update(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, income, 'Income updated');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await incomeService.remove(Number(req.params.id), req.body?.reason, req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Income deleted');
});

export const categories = asyncHandler(async (req, res) => {
  const cats = await incomeService.categories();
  return ApiResponse.success(res, cats, 'Income categories fetched');
});

export default { list, getById, create, update, remove, categories };
