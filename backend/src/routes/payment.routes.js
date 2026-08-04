import { Router } from 'express';
import paymentController from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { singleUpload } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { createPaymentValidator } from '../validators/payment.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(authenticate);

const MANAGE = [ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN];

router.get('/', paymentController.list);
router.get('/:id', paymentController.getById);
router.post('/', authorize(...MANAGE), validate(createPaymentValidator), paymentController.create);
router.post('/:id/void', authorize(...MANAGE), paymentController.voidPayment);
router.post('/:id/attachments', authorize(...MANAGE), uploadLimiter, singleUpload('payments'), paymentController.addAttachment);
router.delete('/:id/attachments/:attachmentId', authorize(...MANAGE), paymentController.deleteAttachment);

export default router;
