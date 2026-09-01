import { Router } from 'express';
import * as trashController from '../controllers/trash.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { TRASH_ACCESS } from '../utils/constants.js';

const router = Router();

router.use(authenticate);
router.use(authorize(...TRASH_ACCESS));

router.get('/', trashController.list);
router.post('/:id/restore', trashController.restore);

export default router;
