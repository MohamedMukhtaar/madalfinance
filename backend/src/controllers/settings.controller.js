import settingsService from '../services/settings.service.js';
import dashboardService from '../services/dashboard.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await settingsService.get();
  return ApiResponse.success(res, settings, 'Settings fetched');
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.update(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, settings, 'Settings updated');
});

export const dashboardStats = asyncHandler(async (req, res) => {
  const year = req.query.year ? Number(req.query.year) : undefined;
  const month = req.query.month ? Number(req.query.month) : undefined;
  const data = await dashboardService.getStats({ year, month });
  return ApiResponse.success(res, data, 'Dashboard stats fetched');
});

export const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Logo file is required');
  const settings = await settingsService.uploadLogo(req.file, req.user.id, req.ip);
  return ApiResponse.success(res, settings, 'Company logo uploaded');
});

export const removeLogo = asyncHandler(async (req, res) => {
  const settings = await settingsService.removeLogo(req.user.id, req.ip);
  return ApiResponse.success(res, settings, 'Company logo removed');
});

export default { getSettings, updateSettings, dashboardStats, uploadLogo, removeLogo };
