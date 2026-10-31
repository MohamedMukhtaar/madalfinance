import { Router } from 'express';
import expenseController from '../controllers/expense.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { singleUpload } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import {
  createExpenseValidator,
  updateExpenseValidator,
  createCategoryValidator,
  createChargeValidator,
  updateChargeValidator,
  payChargeValidator,
} from '../validators/expense.validator.js';
import { P, manageModule } from '../utils/constants.js';

const router = Router();
router.use(authenticate);
router.use(authorize(P.view('expenses')));

const MANAGE = manageModule('expenses');

router.get('/', expenseController.list);
router.get('/categories', expenseController.categories);
router.put('/categories/:id', authorize(...MANAGE), validate(createCategoryValidator), expenseController.updateCategory);
router.delete('/categories/:id', authorize(...MANAGE), expenseController.deleteCategory);
router.get('/charges', expenseController.listCharges);
router.post('/charges', authorize(...MANAGE), validate(createChargeValidator), expenseController.createCharge);
router.put('/charges/:id', authorize(...MANAGE), validate(updateChargeValidator), expenseController.updateCharge);
router.delete('/charges/:id', authorize(...MANAGE), expenseController.deleteCharge);
router.post('/charges/:id/pay', authorize(...MANAGE), validate(payChargeValidator), expenseController.payCharge);
router.get('/:id', expenseController.getById);
router.post('/', authorize(...MANAGE), validate(createExpenseValidator), expenseController.create);
router.post('/categories', authorize(...MANAGE), validate(createCategoryValidator), expenseController.createCategory);
router.put('/:id', authorize(...MANAGE), validate(updateExpenseValidator), expenseController.update);
router.delete('/:id', authorize(...MANAGE), expenseController.remove);
router.post('/:id/attachments', authorize(...MANAGE), uploadLimiter, singleUpload('expenses'), expenseController.addAttachment);
router.delete('/:id/attachments/:attachmentId', authorize(...MANAGE), expenseController.deleteAttachment);

export default router;
