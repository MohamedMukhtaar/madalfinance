import hrLookupService from '../services/hrLookup.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const rows = await hrLookupService.list(req.params.kind);
  return ApiResponse.success(res, rows, 'Records fetched');
});

export const create = asyncHandler(async (req, res) => {
  const row = await hrLookupService.create(req.params.kind, req.body, req.user.id, req.ip);
  return ApiResponse.success(res, row, 'Record created', 201);
});

export const update = asyncHandler(async (req, res) => {
  const row = await hrLookupService.update(req.params.kind, Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, row, 'Record updated');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await hrLookupService.remove(req.params.kind, Number(req.params.id), req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Record deleted');
});

export default { list, create, update, remove };
