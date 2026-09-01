import transactionService from '../services/transaction.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseListQuery, paginationMeta } from '../helpers/queryHelper.js';

export const list = asyncHandler(async (req, res) => {
  const q = parseListQuery(req.query, {
    allowedSorts: ['transaction_id', 'transaction_date', 'transaction_type', 'income', 'expense', 'balance_after', 'created_at'],
    defaultSort: 'created_at:asc',
  });
  const { rows, total, currentBalance } = await transactionService.list({
    type: req.query.type || '',
    fromDate: req.query.from_date || '',
    toDate: req.query.to_date || '',
    offset: q.offset,
    perPage: q.perPage,
    order: q.order,
  });
  return ApiResponse.success(res, rows, 'Transactions fetched', 200, {
    ...paginationMeta(q.page, q.perPage, total),
    current_balance: currentBalance,
  });
});

export const summary = asyncHandler(async (req, res) => {
  const data = await transactionService.summary({
    fromDate: req.query.from_date || '',
    toDate: req.query.to_date || '',
  });
  return ApiResponse.success(res, data, 'Transaction summary fetched');
});

export default { list, summary };
