import { Router } from 'express';
import reportController from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { reportQueryValidator } from '../validators/settings.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(authenticate);
router.use(authorize(ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN));
router.use(validate(reportQueryValidator));

router.get('/income-statement', reportController.incomeStatement);
router.get('/monthly-revenue', reportController.monthlyRevenue);
router.get('/cash-flow', reportController.cashFlow);
router.get('/rental-revenue', reportController.rentalRevenue);
router.get('/outstanding-customers', reportController.outstandingCustomers);
router.get('/expenses-by-category', reportController.expenseByCategory);
router.get('/contributions/:batchId', reportController.contributionReport);
router.get('/projects', reportController.projectReport);
router.get('/export/:kind', reportController.exportReport);

export default router;
