import { Router } from 'express';
import paymentController from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { singleUpload } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { createPaymentValidator, updatePaymentValidator } from '../validators/payment.validator.js';
import { APP_ACCESS, MANAGE_ROLES } from '../utils/constants.js';

const router = Router();
router.use(authenticate);
router.use(authorize(...APP_ACCESS));

const MANAGE = MANAGE_ROLES;

router.get('/', paymentController.list);
router.get('/:id/pdf', paymentController.generatePdf);
router.get('/:id', paymentController.getById);
router.post('/', authorize(...MANAGE), validate(createPaymentValidator), paymentController.create);
router.put('/:id', authorize(...MANAGE), validate(updatePaymentValidator), paymentController.update);
router.post('/:id/void', authorize(...MANAGE), paymentController.voidPayment);
router.post('/:id/attachments', authorize(...MANAGE), uploadLimiter, singleUpload('payments'), paymentController.addAttachment);
router.delete('/:id/attachments/:attachmentId', authorize(...MANAGE), paymentController.deleteAttachment);

export default router;
