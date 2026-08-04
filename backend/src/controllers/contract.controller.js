import contractService from '../services/contract.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const list = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['contract_id', 'contract_number', 'contract_date', 'contract_amount', 'status', 'created_at'],
  });
  const { rows, total } = await contractService.list({
    search: q.search,
    status: req.query.status || '',
    customerId: req.query.customer_id || '',
    projectId: req.query.project_id || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Contracts fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const getById = asyncHandler(async (req, res) => {
  const contract = await contractService.getById(Number(req.params.id));
  return ApiResponse.success(res, contract, 'Contract fetched');
});

export const create = asyncHandler(async (req, res) => {
  const contract = await contractService.create(req.body, req.user.id, req.ip);
  return ApiResponse.success(res, contract, 'Contract created', 201);
});

export const update = asyncHandler(async (req, res) => {
  const contract = await contractService.update(Number(req.params.id), req.body, req.user.id, req.ip);
  return ApiResponse.success(res, contract, 'Contract updated');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await contractService.remove(Number(req.params.id), req.body?.reason, req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Contract deleted');
});

export const uploadSigned = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  const contract = await contractService.saveSignedAgreement(Number(req.params.id), req.file, req.user.id, req.ip);
  return ApiResponse.success(res, contract, 'Signed agreement uploaded');
});

export const downloadSigned = asyncHandler(async (req, res) => {
  const { path, name } = await contractService.downloadSigned(Number(req.params.id));
  res.download(path, name);
});

export default { list, getById, create, update, remove, uploadSigned, downloadSigned };
