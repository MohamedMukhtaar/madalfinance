import authService from '../services/auth.service.js';
import userService from '../services/user.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const clientInfo = (req) => ({ ip: req.ip, device: req.headers['user-agent'] || null });

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const { ip, device } = clientInfo(req);
  const data = await authService.login(username, password, ip, device);
  return ApiResponse.success(res, data, 'Login successful');
});

export const refresh = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  const { ip, device } = clientInfo(req);
  const data = await authService.refresh(refresh_token, ip, device);
  return ApiResponse.success(res, data, 'Tokens refreshed');
});

export const logout = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  await authService.logout(refresh_token, req.user.id);
  return ApiResponse.success(res, null, 'Logged out');
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  return ApiResponse.success(res, { user }, 'Profile loaded');
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.body, req.ip);
  return ApiResponse.success(res, { user }, 'Profile updated');
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(
    req.user.id,
    req.body.current_password,
    req.body.new_password,
    req.ip
  );
  return ApiResponse.success(res, null, 'Password changed. Please log in again.');
});

export const changeUsername = asyncHandler(async (req, res) => {
  await authService.changeUsername(req.user.id, req.body.current_password, req.body.new_username, req.ip);
  return ApiResponse.success(res, null, 'Username changed');
});

export default { login, refresh, logout, me, updateProfile, changePassword, changeUsername };
