import projectService from '../services/project.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const list = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['project_id', 'project_name', 'project_price', 'start_date', 'expected_finish', 'status', 'created_at'],
  });
  const { rows, total } = await projectService.list({
    search: q.search,
    status: req.query.status || '',
    projectType: req.query.project_type || '',
    customerId: req.query.customer_id || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Projects fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const getById = asyncHandler(async (req, res) => {
  const project = await projectService.getById(Number(req.params.id));
  return ApiResponse.success(res, project, 'Project fetched');
});

export const create = asyncHandler(async (req, res) => {
  const project = await projectService.create(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, project, 'Project created', 201);
});

export const update = asyncHandler(async (req, res) => {
  const project = await projectService.update(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, project, 'Project updated');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await projectService.remove(Number(req.params.id), req.body?.reason, req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Project deleted');
});

export const types = asyncHandler(async (req, res) => {
  const projectTypes = await projectService.types();
  return ApiResponse.success(res, projectTypes, 'Project types fetched');
});

export default { list, getById, create, update, remove, types };
