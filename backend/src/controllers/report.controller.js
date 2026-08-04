import reportService from '../services/report.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const incomeStatement = asyncHandler(async (req, res) => {
  const data = await reportService.incomeStatement(req.query.from_date || '', req.query.to_date || '');
  return ApiResponse.success(res, data, 'Income statement generated');
});

export const monthlyRevenue = asyncHandler(async (req, res) => {
  const data = await reportService.monthlyRevenue(Number(req.query.months) || 12);
  return ApiResponse.success(res, data, 'Monthly revenue generated');
});

export const cashFlow = asyncHandler(async (req, res) => {
  const data = await reportService.cashFlow(req.query.from_date || '', req.query.to_date || '');
  return ApiResponse.success(res, data, 'Cash flow generated');
});

export const rentalRevenue = asyncHandler(async (req, res) => {
  const data = await reportService.rentalRevenue(req.query.from_date || '', req.query.to_date || '');
  return ApiResponse.success(res, data, 'Rental revenue generated');
});

export const outstandingCustomers = asyncHandler(async (req, res) => {
  const data = await reportService.outstandingCustomers();
  return ApiResponse.success(res, data, 'Outstanding customers generated');
});

export const expenseByCategory = asyncHandler(async (req, res) => {
  const data = await reportService.expenseByCategory(req.query.from_date || '', req.query.to_date || '');
  return ApiResponse.success(res, data, 'Expense breakdown generated');
});

export const contributionReport = asyncHandler(async (req, res) => {
  const data = await reportService.contributionReport(Number(req.params.batchId));
  return ApiResponse.success(res, data, 'Contribution report generated');
});

export const projectReport = asyncHandler(async (req, res) => {
  const data = await reportService.projectReport();
  return ApiResponse.success(res, data, 'Project report generated');
});

/** Streams a generated PDF/XLSX report as a file download. */
export const exportReport = asyncHandler(async (req, res) => {
  const { filename, filePath } = await reportService.export(
    req.params.kind,
    {
      fromDate: req.query.from_date || '',
      toDate: req.query.to_date || '',
      months: Number(req.query.months) || 12,
      batchId: Number(req.query.batch_id) || null,
    },
    req.query.format || 'pdf',
    req.user.id,
    req.ip
  );
  res.download(filePath, filename);
});

export default {
  incomeStatement,
  monthlyRevenue,
  cashFlow,
  rentalRevenue,
  outstandingCustomers,
  expenseByCategory,
  contributionReport,
  projectReport,
  exportReport,
};
