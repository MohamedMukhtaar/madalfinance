import settingsService from '../services/settings.service.js';
import dashboardService from '../services/dashboard.service.js';
import ApiResponse from '../utils/ApiResponse.js';
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

export default { getSettings, updateSettings, dashboardStats };
