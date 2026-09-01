import { Router } from 'express';
import transactionController from '../controllers/transaction.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { APP_ACCESS } from '../utils/constants.js';

const router = Router();
router.use(authenticate);
router.use(authorize(...APP_ACCESS));

router.get('/', transactionController.list);
router.get('/summary', transactionController.summary);

export default router;
