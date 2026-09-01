import { Router } from 'express';
import reportController from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { reportQueryValidator } from '../validators/settings.validator.js';
import { APP_ACCESS } from '../utils/constants.js';

const router = Router();
router.use(authenticate);
router.use(authorize(...APP_ACCESS));
router.use(validate(reportQueryValidator));

router.get('/income-statement', reportController.incomeStatement);
router.get('/monthly-revenue', reportController.monthlyRevenue);
router.get('/cash-flow', reportController.cashFlow);
router.get('/rental-revenue', reportController.rentalRevenue);
router.get('/outstanding-customers', reportController.outstandingCustomers);
router.get('/expenses-by-category', reportController.expenseByCategory);
router.get('/contributions/:batchId', reportController.contributionReport);
router.get('/projects', reportController.projectReport);
router.get('/member-statement', reportController.memberStatement);
router.get('/export/:kind', reportController.exportReport);
router.post('/export/:kind/async', reportController.exportReportAsync);
router.get('/export-jobs/:id', reportController.exportJobStatus);
router.get('/export-jobs/:id/download', reportController.downloadExportJob);

export default router;
