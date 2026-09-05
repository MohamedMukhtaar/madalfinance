import reportService from '../services/report.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
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

export const customerPaymentStatus = asyncHandler(async (req, res) => {
  const data = await reportService.customerPaymentStatus();
  return ApiResponse.success(res, data, 'Customer payment status generated');
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

export const memberStatement = asyncHandler(async (req, res) => {
  const memberId = Number(req.query.member_id);
  if (!memberId) throw ApiError.badRequest('member_id is required');
  const data = await reportService.memberStatement(
    memberId,
    req.query.from_date || '',
    req.query.to_date || ''
  );
  return ApiResponse.success(res, data, 'Member statement generated');
});

export const customerStatement = asyncHandler(async (req, res) => {
  const customerId = Number(req.query.customer_id);
  if (!customerId) throw ApiError.badRequest('customer_id is required');
  const data = await reportService.customerStatement(
    customerId,
    req.query.from_date || '',
    req.query.to_date || ''
  );
  return ApiResponse.success(res, data, 'Customer statement generated');
});

export const projectStatement = asyncHandler(async (req, res) => {
  const projectId = Number(req.query.project_id);
  if (!projectId) throw ApiError.badRequest('project_id is required');
  const data = await reportService.projectStatement(
    projectId,
    req.query.from_date || '',
    req.query.to_date || ''
  );
  return ApiResponse.success(res, data, 'Project statement generated');
});

export const expenseStatement = asyncHandler(async (req, res) => {
  const expenseId = Number(req.query.expense_id);
  if (!expenseId) throw ApiError.badRequest('expense_id is required');
  const data = await reportService.expenseStatement(
    expenseId,
    req.query.from_date || '',
    req.query.to_date || ''
  );
  return ApiResponse.success(res, data, 'Expense statement generated');
});

export const salaryStatement = asyncHandler(async (req, res) => {
  const employeeId = Number(req.query.employee_id);
  if (!employeeId) throw ApiError.badRequest('employee_id is required');
  const data = await reportService.salaryStatement(
    employeeId,
    req.query.from_date || '',
    req.query.to_date || ''
  );
  return ApiResponse.success(res, data, 'Salary statement generated');
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
      memberId: Number(req.query.member_id) || null,
      customerId: Number(req.query.customer_id) || null,
      accId: Number(req.query.acc_id) || null,
      projectId: Number(req.query.project_id) || null,
      expenseId: Number(req.query.expense_id) || null,
      employeeId: Number(req.query.employee_id) || null,
    },
    req.query.format || 'pdf',
    req.user.id,
    req.ip
  );
  res.download(filePath, filename);
});

export const exportReportAsync = asyncHandler(async (req, res) => {
  const job = await reportService.enqueueExport(
    req.params.kind,
    {
      fromDate: req.query.from_date || '',
      toDate: req.query.to_date || '',
      months: Number(req.query.months) || 12,
      batchId: Number(req.query.batch_id) || null,
      memberId: Number(req.query.member_id) || null,
      customerId: Number(req.query.customer_id) || null,
      accId: Number(req.query.acc_id) || null,
      projectId: Number(req.query.project_id) || null,
      expenseId: Number(req.query.expense_id) || null,
      employeeId: Number(req.query.employee_id) || null,
    },
    req.query.format || 'pdf',
    req.user.id,
    req.ip
  );
  return ApiResponse.success(res, job, 'Export queued', 202);
});

export const exportJobStatus = asyncHandler(async (req, res) => {
  const job = await reportService.getExportJob(Number(req.params.id), req.user.id);
  return ApiResponse.success(res, job, 'Export job fetched');
});

export const downloadExportJob = asyncHandler(async (req, res) => {
  const job = await reportService.getExportJob(Number(req.params.id), req.user.id);
  if (job.status !== 'completed' || !job.file_path) {
    throw ApiError.badRequest('Export is not ready for download');
  }
  const filename = job.file_path.split(/[/\\]/).pop();
  res.download(job.file_path, filename);
});

export default {
  incomeStatement,
  monthlyRevenue,
  cashFlow,
  rentalRevenue,
  outstandingCustomers,
  customerPaymentStatus,
  expenseByCategory,
  contributionReport,
  projectReport,
  memberStatement,
  customerStatement,
  projectStatement,
  expenseStatement,
  salaryStatement,
  exportReport,
  exportReportAsync,
  exportJobStatus,
  downloadExportJob,
};
