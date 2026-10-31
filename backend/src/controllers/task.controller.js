import taskService from '../services/task.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const list = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['task_id', 'title', 'priority', 'status', 'due_date', 'created_at'],
    defaultSort: 'due_date:asc',
  });
  const { rows, total } = await taskService.list({
    search: q.search,
    status: req.query.status || '',
    priority: req.query.priority || '',
    assigneeType: req.query.assignee_type || '',
    employeeId: req.query.employee_id || '',
    memberId: req.query.member_id || '',
    fromDate: req.query.from_date || '',
    toDate: req.query.to_date || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Tasks fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const stats = asyncHandler(async (_req, res) => {
  const data = await taskService.stats();
  return ApiResponse.success(res, data, 'Task stats fetched');
});

export const getById = asyncHandler(async (req, res) => {
  const task = await taskService.getById(Number(req.params.id));
  return ApiResponse.success(res, task, 'Task fetched');
});

export const create = asyncHandler(async (req, res) => {
  const task = await taskService.create(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, task, 'Task created', 201);
});

export const update = asyncHandler(async (req, res) => {
  const task = await taskService.update(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, task, 'Task updated');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await taskService.remove(Number(req.params.id), req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Task deleted');
});

export default { list, stats, getById, create, update, remove };
