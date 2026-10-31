import { Router } from 'express';
import taskController from '../controllers/task.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { createTaskValidator, updateTaskValidator } from '../validators/task.validator.js';
import { P, manageModule } from '../utils/constants.js';

const router = Router();
router.use(authenticate);
router.use(authorize(P.view('tasks')));

const MANAGE = manageModule('tasks');

router.get('/stats', taskController.stats);
router.get('/', taskController.list);
router.get('/:id', taskController.getById);
router.post('/', authorize(...MANAGE), validate(createTaskValidator), taskController.create);
router.put('/:id', authorize(...MANAGE), validate(updateTaskValidator), taskController.update);
router.delete('/:id', authorize(...MANAGE), taskController.remove);

export default router;
