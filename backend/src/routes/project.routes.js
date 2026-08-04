import { Router } from 'express';
import projectController from '../controllers/project.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createProjectValidator, updateProjectValidator } from '../validators/project.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(authenticate);

const MANAGE = [ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN];

router.get('/', projectController.list);
router.get('/types', projectController.types);
router.get('/:id', projectController.getById);
router.post('/', authorize(...MANAGE), validate(createProjectValidator), projectController.create);
router.put('/:id', authorize(...MANAGE), validate(updateProjectValidator), projectController.update);
router.delete('/:id', authorize(...MANAGE), projectController.remove);

export default router;
