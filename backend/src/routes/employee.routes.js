import { Router } from 'express';
import employeeController from '../controllers/employee.controller.js';
import hrLookupController from '../controllers/hrLookup.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createEmployeeValidator, updateEmployeeValidator } from '../validators/employee.validator.js';
import { createLookupValidator, lookupKindParam, updateLookupValidator } from '../validators/hrLookup.validator.js';
import { APP_ACCESS, MANAGE_ROLES } from '../utils/constants.js';
import { lookupKinds } from '../repositories/hrLookup.repo.js';

const router = Router();
router.use(authenticate);
router.use(authorize(...APP_ACCESS));

const MANAGE = MANAGE_ROLES;
const kindPath = `:kind(${lookupKinds.join('|')})`;

router.get('/', employeeController.list);
router.get(`/${kindPath}`, validate(lookupKindParam), hrLookupController.list);
router.post(`/${kindPath}`, authorize(...MANAGE), validate(createLookupValidator), hrLookupController.create);
router.put(`/${kindPath}/:id`, authorize(...MANAGE), validate(updateLookupValidator), hrLookupController.update);
router.delete(`/${kindPath}/:id`, authorize(...MANAGE), validate(lookupKindParam), hrLookupController.remove);

router.get('/:id', employeeController.getById);
router.post('/', authorize(...MANAGE), validate(createEmployeeValidator), employeeController.create);
router.put('/:id', authorize(...MANAGE), validate(updateEmployeeValidator), employeeController.update);
router.delete('/:id', authorize(...MANAGE), employeeController.remove);

export default router;
