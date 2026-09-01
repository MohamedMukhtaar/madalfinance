import { Router } from 'express';
import expenseController from '../controllers/expense.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { singleUpload } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { createExpenseValidator, updateExpenseValidator, createCategoryValidator } from '../validators/expense.validator.js';
import { APP_ACCESS, MANAGE_ROLES } from '../utils/constants.js';

const router = Router();
router.use(authenticate);
router.use(authorize(...APP_ACCESS));

const MANAGE = MANAGE_ROLES;

router.get('/', expenseController.list);
router.get('/categories', expenseController.categories);
router.get('/:id', expenseController.getById);
router.post('/', authorize(...MANAGE), validate(createExpenseValidator), expenseController.create);
router.post('/categories', authorize(...MANAGE), validate(createCategoryValidator), expenseController.createCategory);
router.put('/:id', authorize(...MANAGE), validate(updateExpenseValidator), expenseController.update);
router.delete('/:id', authorize(...MANAGE), expenseController.remove);
router.post('/:id/attachments', authorize(...MANAGE), uploadLimiter, singleUpload('expenses'), expenseController.addAttachment);
router.delete('/:id/attachments/:attachmentId', authorize(...MANAGE), expenseController.deleteAttachment);

export default router;
