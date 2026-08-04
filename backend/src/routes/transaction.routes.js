import { Router } from 'express';
import transactionController from '../controllers/transaction.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(authenticate);

router.get('/', transactionController.list);
router.get('/summary', authorize(ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN), transactionController.summary);

export default router;
