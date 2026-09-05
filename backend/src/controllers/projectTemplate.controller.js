import templateService from '../services/projectTemplate.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const rows = await templateService.list({
    search: req.query.search || '',
    status: req.query.status || '',
  });
  return ApiResponse.success(res, rows, 'Registered projects fetched');
});

export const getById = asyncHandler(async (req, res) => {
  const row = await templateService.getById(Number(req.params.id));
  return ApiResponse.success(res, row, 'Registered project fetched');
});

export const create = asyncHandler(async (req, res) => {
  const row = await templateService.create(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, row, 'Project registered', 201);
});

export const update = asyncHandler(async (req, res) => {
  const row = await templateService.update(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, row, 'Registered project updated');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await templateService.remove(Number(req.params.id), req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Registered project deleted');
});

export const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Logo file is required');
  const row = await templateService.uploadLogo(Number(req.params.id), req.file, req.user.id, req.ip);
  return ApiResponse.success(res, row, 'Logo uploaded');
});

export default { list, getById, create, update, remove, uploadLogo };
