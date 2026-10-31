import organizationService from '../services/organization.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getProfile = asyncHandler(async (_req, res) => {
  const org = await organizationService.get();
  return ApiResponse.success(res, org, 'Organization profile fetched');
});

export const updateProfile = asyncHandler(async (req, res) => {
  const org = await organizationService.updateProfile(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, org, 'Organization profile updated');
});

export const updateColors = asyncHandler(async (req, res) => {
  const org = await organizationService.updateColors(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, org, 'Brand colors saved');
});

export const uploadImage = asyncHandler(async (req, res) => {
  const org = await organizationService.uploadImage(req.params.kind, req.file, req.user.id, req.ip);
  return ApiResponse.success(res, org, 'Image uploaded');
});

export const removeImage = asyncHandler(async (req, res) => {
  const org = await organizationService.removeImage(req.params.kind, req.user.id, req.ip);
  return ApiResponse.success(res, org, 'Image removed');
});

export default { getProfile, updateProfile, updateColors, uploadImage, removeImage };
