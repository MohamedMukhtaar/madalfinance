import { Router } from 'express';
import * as trashController from '../controllers/trash.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { ROLES } from '../utils/constants.js';

const MANAGE = [ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN];

const router = Router();

router.use(authenticate);

router.get('/', authorize(...MANAGE), trashController.list);
router.post('/:id/restore', authorize(...MANAGE), trashController.restore);

export default router;
