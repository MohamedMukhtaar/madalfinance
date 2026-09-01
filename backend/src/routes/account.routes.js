import { Router } from 'express';
import accountController from '../controllers/account.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  createAccountValidator,
  transferValidator,
  updateAccountValidator,
} from '../validators/account.validator.js';
import { APP_ACCESS, MANAGE_ROLES } from '../utils/constants.js';

const router = Router();
const MANAGE = MANAGE_ROLES;

router.use(authenticate);
router.use(authorize(...APP_ACCESS));

router.get('/', accountController.list);
router.get('/default', accountController.getDefault);
router.get('/transfers', accountController.listTransfers);
router.get('/:id/statement', accountController.statement);
router.get('/:id', accountController.getById);
router.post('/', validate(createAccountValidator), accountController.create);
router.post('/transfer', validate(transferValidator), accountController.transfer);
router.patch('/:id', validate(updateAccountValidator), accountController.update);
router.patch('/:id/default', accountController.setDefault);

export default router;
