import { Router } from 'express';
import organizationController from '../controllers/organization.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { singleUpload } from '../helpers/fileHelper.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize('view organizations'), organizationController.getProfile);
router.put('/', authorize('edit organizations'), organizationController.updateProfile);
router.put('/colors', authorize('edit organizations'), organizationController.updateColors);
router.post(
  '/images/:kind',
  authorize('edit organizations'),
  uploadLimiter,
  singleUpload('logos'),
  organizationController.uploadImage
);
router.delete('/images/:kind', authorize('edit organizations'), organizationController.removeImage);

export default router;
