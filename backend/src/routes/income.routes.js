import { Router } from 'express';
import incomeController from '../controllers/income.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createIncomeValidator, updateIncomeValidator, createIncomeCategoryValidator } from '../validators/income.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(authenticate);

const MANAGE = [ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN];

router.get('/', incomeController.list);
router.get('/categories', incomeController.categories);
router.get('/:id', incomeController.getById);
router.post('/', authorize(...MANAGE), validate(createIncomeValidator), incomeController.create);
router.post('/categories', authorize(...MANAGE), validate(createIncomeCategoryValidator), incomeController.createCategory);
router.put('/:id', authorize(...MANAGE), validate(updateIncomeValidator), incomeController.update);
router.delete('/:id', authorize(...MANAGE), incomeController.remove);

export default router;
