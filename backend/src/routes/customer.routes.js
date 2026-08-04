import { Router } from 'express';
import customerController from '../controllers/customer.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createCustomerValidator, updateCustomerValidator, addContactValidator } from '../validators/customer.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(authenticate);

const MANAGE = [ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN];

router.get('/', customerController.list);
router.get('/:id', customerController.getById);
router.get('/:id/statement', customerController.statement);
router.post('/', authorize(...MANAGE), validate(createCustomerValidator), customerController.create);
router.put('/:id', authorize(...MANAGE), validate(updateCustomerValidator), customerController.update);
router.delete('/:id', authorize(...MANAGE), customerController.remove);
router.post('/:id/contacts', authorize(...MANAGE), validate(addContactValidator), customerController.addContact);

export default router;
