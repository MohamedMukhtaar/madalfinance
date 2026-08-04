import { Router } from 'express';
import invoiceController from '../controllers/invoice.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { singleUpload } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { createInvoiceValidator, updateInvoiceValidator, setInvoiceStatusValidator } from '../validators/invoice.validator.js';
import { ROLES } from '../utils/constants.js';

const router = Router();
router.use(authenticate);

const MANAGE = [ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN];

router.get('/', invoiceController.list);
router.get('/:id', invoiceController.getById);
router.get('/:id/pdf', invoiceController.generatePdf);
router.post('/', authorize(...MANAGE), validate(createInvoiceValidator), invoiceController.create);
router.put('/:id', authorize(...MANAGE), validate(updateInvoiceValidator), invoiceController.update);
router.patch('/:id/status', authorize(...MANAGE), validate(setInvoiceStatusValidator), invoiceController.setStatus);
router.delete('/:id', authorize(...MANAGE), invoiceController.remove);
router.post('/:id/attachments', authorize(...MANAGE), uploadLimiter, singleUpload('invoices'), invoiceController.addAttachment);
router.delete('/:id/attachments/:attachmentId', authorize(...MANAGE), invoiceController.deleteAttachment);

export default router;
