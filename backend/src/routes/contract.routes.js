import { Router } from 'express';
import contractController from '../controllers/contract.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { singleUpload } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { createContractValidator, updateContractValidator } from '../validators/contract.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(authenticate);

const MANAGE = [ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN];

router.get('/', contractController.list);
router.get('/:id', contractController.getById);
router.get('/:id/download', contractController.downloadSigned);
router.post('/', authorize(...MANAGE), validate(createContractValidator), contractController.create);
router.put('/:id', authorize(...MANAGE), validate(updateContractValidator), contractController.update);
router.delete('/:id', authorize(...MANAGE), contractController.remove);
router.post(
  '/:id/signed',
  authorize(...MANAGE),
  uploadLimiter,
  singleUpload('contracts'),
  contractController.uploadSigned
);

export default router;
