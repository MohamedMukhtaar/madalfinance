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
import { P, manageModule } from '../utils/constants.js';

const router = Router();
const MANAGE = manageModule('accounts');

router.use(authenticate);
router.use(authorize(P.view('accounts')));

router.get('/', accountController.list);
router.get('/default', accountController.getDefault);
router.get('/transfers', accountController.listTransfers);
router.get('/:id/statement', accountController.statement);
router.get('/:id', accountController.getById);
router.post('/', validate(createAccountValidator), accountController.create);
router.post('/transfer', validate(transferValidator), accountController.transfer);
router.patch('/:id', validate(updateAccountValidator), accountController.update);
router.patch('/:id/default', accountController.setDefault);
router.delete('/transfers/:id', authorize(...MANAGE), accountController.removeTransfer);
router.delete('/:id', authorize(...MANAGE), accountController.remove);

export default router;
