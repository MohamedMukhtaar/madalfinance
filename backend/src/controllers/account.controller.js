import accountService from '../services/account.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const list = asyncHandler(async (_req, res) => {
  const rows = await accountService.list();
  return ApiResponse.success(res, rows, 'Accounts fetched');
});

export const getById = asyncHandler(async (req, res) => {
  const account = await accountService.getById(Number(req.params.id));
  return ApiResponse.success(res, account, 'Account fetched');
});

export const getDefault = asyncHandler(async (_req, res) => {
  const account = await accountService.getDefault();
  return ApiResponse.success(res, account, 'Default account fetched');
});

export const create = asyncHandler(async (req, res) => {
  const account = await accountService.create(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, account, 'Account created', 201);
});

export const update = asyncHandler(async (req, res) => {
  const account = await accountService.update(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, account, 'Account updated');
});

export const setDefault = asyncHandler(async (req, res) => {
  const account = await accountService.setDefault(Number(req.params.id), req.user.id, req.ip);
  return ApiResponse.success(res, account, 'Default account updated');
});

export const transfer = asyncHandler(async (req, res) => {
  const result = await accountService.transfer(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Transfer completed', 201);
});

export const listTransfers = asyncHandler(async (req, res) => {
  const rows = await accountService.listTransfers({
    fromDate: req.query.from_date || '',
    toDate: req.query.to_date || '',
    accId: req.query.acc_id ? Number(req.query.acc_id) : undefined,
  });
  return ApiResponse.success(res, rows, 'Transfers fetched');
});

export const statement = asyncHandler(async (req, res) => {
  const paginate = req.query.per_page != null || req.query.page != null;
  const q = parseListQuery(req.query, { defaultSort: 'movement_date:asc' });
  const data = await accountService.statement(Number(req.params.id), {
    fromDate: req.query.from_date || '',
    toDate: req.query.to_date || '',
    offset: paginate ? q.offset : undefined,
    perPage: paginate ? q.perPage : undefined,
  });
  return ApiResponse.success(
    res,
    data,
    'Account statement fetched',
    200,
    paginate ? paginationMeta(q.page, q.perPage, data.total) : undefined
  );
});

export default { list, getById, getDefault, create, update, setDefault, transfer, listTransfers, statement };
