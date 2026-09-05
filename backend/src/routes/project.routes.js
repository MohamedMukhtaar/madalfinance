import { Router } from 'express';
import projectController from '../controllers/project.controller.js';
import templateController from '../controllers/projectTemplate.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { singleUpload } from '../helpers/fileHelper.js';
import { createProjectValidator, updateProjectValidator } from '../validators/project.validator.js';
import { createTemplateValidator, updateTemplateValidator } from '../validators/projectTemplate.validator.js';
import { APP_ACCESS, MANAGE_ROLES } from '../utils/constants.js';

const router = Router();
router.use(authenticate);
router.use(authorize(...APP_ACCESS));

const MANAGE = MANAGE_ROLES;

router.get('/templates', templateController.list);
router.get('/templates/:id', templateController.getById);
router.post('/templates', authorize(...MANAGE), validate(createTemplateValidator), templateController.create);
router.put('/templates/:id', authorize(...MANAGE), validate(updateTemplateValidator), templateController.update);
router.delete('/templates/:id', authorize(...MANAGE), templateController.remove);
router.post(
  '/templates/:id/logo',
  authorize(...MANAGE),
  uploadLimiter,
  singleUpload('projects'),
  templateController.uploadLogo
);

router.get('/', projectController.list);
router.get('/types', projectController.types);
router.get('/:id', projectController.getById);
router.post('/', authorize(...MANAGE), validate(createProjectValidator), projectController.create);
router.put('/:id', authorize(...MANAGE), validate(updateProjectValidator), projectController.update);
router.delete('/:id', authorize(...MANAGE), projectController.remove);
router.post('/:id/logo', authorize(...MANAGE), uploadLimiter, singleUpload('projects'), projectController.uploadLogo);
router.post(
  '/:id/attachment',
  authorize(...MANAGE),
  uploadLimiter,
  singleUpload('projects'),
  projectController.uploadAttachment
);

export default router;
