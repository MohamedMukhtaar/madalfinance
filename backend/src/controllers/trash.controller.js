import trashService from '../services/trash.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const list = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['trash_id', 'deleted_at', 'entity_type'],
  });
  const { rows, total } = await trashService.list({
    search: q.search,
    entityType: req.query.entity_type || req.query.entityType || '',
    offset: q.offset,
    perPage: q.perPage,
  });
  return ApiResponse.success(res, rows, 'Trash fetched', 200, paginationMeta(q.page, q.perPage, total));
});

export const restore = asyncHandler(async (req, res) => {
  const result = await trashService.restore(Number(req.params.id), req.user.id, req.ip);
  return ApiResponse.success(res, result, 'Item restored');
});

export default { list, restore };
