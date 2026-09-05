import employeeService from '../services/employee.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const list = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['employee_id', 'first_name', 'hire_date', 'basic_salary', 'status', 'created_at'],
    defaultSort: 'first_name:asc',
  });
  const { rows, total } = await employeeService.list({
    search: q.search,
    status: req.query.status || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Employees fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const getById = asyncHandler(async (req, res) => {
  const employee = await employeeService.getById(Number(req.params.id));
  return ApiResponse.success(res, employee, 'Employee fetched');
});

export const create = asyncHandler(async (req, res) => {
  const employee = await employeeService.create(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, employee, 'Employee created', 201);
});

export const update = asyncHandler(async (req, res) => {
  const employee = await employeeService.update(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, employee, 'Employee updated');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await employeeService.remove(Number(req.params.id), req.user.id, req.ip);
  return ApiResponse.success(res, result, result.deleted ? 'Employee deleted' : 'Employee deactivated');
});

export default { list, getById, create, update, remove };
