import userService from '../services/user.service.js';
import memberService from '../services/member.service.js';
import auditService from '../services/audit.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const listUsers = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['user_id', 'username', 'full_name', 'role', 'created_at', 'last_login', 'status'],
  });
  const { rows, total } = await userService.list(q);
  return ApiResponse.success(res, rows, 'Users fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['log_id', 'created_at', 'module', 'action', 'username'],
    defaultSort: 'log_id:desc',
  });
  const { rows, total } = await auditService.list({
    userId: req.query.user_id || '',
    module: req.query.module || '',
    action: req.query.action || '',
    fromDate: req.query.from_date || '',
    toDate: req.query.to_date || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Audit logs fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const listMembers = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['member_id', 'joined_date', 'default_monthly_due', 'status', 'full_name'],
    defaultSort: 'member_id:asc',
  });
  if (q.order.startsWith('full_name')) q.order = q.order.replace('full_name', 'u.full_name');
  const { rows, total } = await memberService.list({
    search: q.search,
    status: req.query.status || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Members fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const createMember = asyncHandler(async (req, res) => {
  const member = await memberService.create(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, member, 'Member created', 201);
});

export const updateMember = asyncHandler(async (req, res) => {
  const member = await memberService.update(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, member, 'Member updated');
});

export const deactivateMember = asyncHandler(async (req, res) => {
  const result = await memberService.deactivate(Number(req.params.id), req.body?.reason, req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Member moved to trash');
});

export const uploadMemberAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image uploaded');
  const member = await memberService.uploadAvatar(Number(req.params.id), req.file, req.user.id, req.ip);
  return ApiResponse.success(res, member, 'Member photo uploaded');
});

export default {
  listUsers,
  listAuditLogs,
  listMembers,
  createMember,
  updateMember,
  deactivateMember,
  uploadMemberAvatar,
};
