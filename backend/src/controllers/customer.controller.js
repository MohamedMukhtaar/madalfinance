import customerService from '../services/customer.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const list = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['customer_id', 'customer_name', 'customer_code', 'status', 'created_at', 'updated_at'],
  });
  const { rows, total } = await customerService.list({
    search: q.search,
    status: req.query.status || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Customers fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const getById = asyncHandler(async (req, res) => {
  const customer = await customerService.getById(Number(req.params.id));
  return ApiResponse.success(res, customer, 'Customer fetched');
});

export const create = asyncHandler(async (req, res) => {
  const customer = await customerService.create(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, customer, 'Customer created', 201);
});

export const update = asyncHandler(async (req, res) => {
  const customer = await customerService.update(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, customer, 'Customer updated');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await customerService.remove(Number(req.params.id), req.body?.reason, req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Customer deleted');
});

export const statement = asyncHandler(async (req, res) => {
  const data = await customerService.statement(
    Number(req.params.id),
    req.query.from_date || '',
    req.query.to_date || ''
  );
  return ApiResponse.success(res, data, 'Customer statement fetched');
});

export const addContact = asyncHandler(async (req, res) => {
  const contacts = await customerService.addContact(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, contacts, 'Contact added');
});

export default { list, getById, create, update, remove, statement, addContact };
