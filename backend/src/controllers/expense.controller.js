import expenseService from '../services/expense.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const list = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['expense_id', 'expense_date', 'amount', 'category_name', 'payment_method', 'created_at'],
    defaultSort: 'created_at:desc',
  });
  const { rows, total } = await expenseService.list({
    search: q.search,
    categoryId: req.query.category_id || '',
    method: req.query.method || '',
    fromDate: req.query.from_date || '',
    toDate: req.query.to_date || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Expenses fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const getById = asyncHandler(async (req, res) => {
  const expense = await expenseService.getById(Number(req.params.id));
  return ApiResponse.success(res, expense, 'Expense fetched');
});

export const create = asyncHandler(async (req, res) => {
  const expense = await expenseService.create(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, expense, 'Expense recorded', 201);
});

export const update = asyncHandler(async (req, res) => {
  const expense = await expenseService.update(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, expense, 'Expense updated');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await expenseService.remove(Number(req.params.id), req.body?.reason, req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Expense deleted');
});

export const categories = asyncHandler(async (req, res) => {
  const cats = await expenseService.categories();
  return ApiResponse.success(res, cats, 'Expense categories fetched');
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await expenseService.createCategory(req.body.name, req.user.id, req.ip);
  return ApiResponse.success(res, category, 'Category created', 201);
});

export const addAttachment = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const attachments = await expenseService.addAttachment(Number(req.params.id), req.file, req.user.id, req.ip);
  return ApiResponse.success(res, attachments, 'Receipt uploaded');
});

export const deleteAttachment = asyncHandler(async (req, res) => {
  await expenseService.deleteAttachment(Number(req.params.id), Number(req.params.attachmentId), req.user.id, req.ip);
  return ApiResponse.success(res, null, 'Receipt deleted');
});

export const listCharges = asyncHandler(async (req, res) => {
  const rows = await expenseService.listCharges(req.query.status || 'open');
  return ApiResponse.success(res, rows, 'Expense charges fetched');
});

export const createCharge = asyncHandler(async (req, res) => {
  const charge = await expenseService.createCharge(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, charge, 'Expense charge added', 201);
});

export const updateCharge = asyncHandler(async (req, res) => {
  const charge = await expenseService.updateCharge(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, charge, 'Expense charge updated');
});

export const deleteCharge = asyncHandler(async (req, res) => {
  const result = await expenseService.deleteCharge(Number(req.params.id), req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Expense charge deleted');
});

export const payCharge = asyncHandler(async (req, res) => {
  const payment = await expenseService.payCharge(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, payment, 'Expense charge paid', 201);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await expenseService.updateCategory(Number(req.params.id), req.body.name, req.user.id, req.ip);
  return ApiResponse.success(res, category, 'Category updated');
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const result = await expenseService.deleteCategory(Number(req.params.id), req.user.id, req.ip);
  const message = result.hidden
    ? `Category is used by ${result.used_by} expense record(s), so it was hidden instead of deleted`
    : 'Category deleted';
  return ApiResponse.success(res, result, message);
});

export default {
  listCharges,
  createCharge,
  updateCharge,
  deleteCharge,
  payCharge,
  updateCategory,
  deleteCategory,
  list, getById, create, update, remove, categories, createCategory, addAttachment, deleteAttachment,
};
