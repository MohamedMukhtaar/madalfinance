import { Router } from 'express';
import contributionController from '../controllers/contribution.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { singleUpload } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { generateBatchValidator, receiveDueValidator, grantCreditValidator, repayLoanValidator, applyCreditValidator } from '../validators/contribution.validator.js';
import { APP_ACCESS, MANAGE_ROLES } from '../utils/constants.js';

const router = Router();
router.use(authenticate);
router.use(authorize(...APP_ACCESS));

const MANAGE = MANAGE_ROLES;

router.get('/batches', contributionController.listBatches);
router.get('/batches/:id', contributionController.getBatch);
router.get('/dues', contributionController.listDues);
router.get('/members', contributionController.members);
router.post('/batches', authorize(...MANAGE), validate(generateBatchValidator), contributionController.generateBatch);
router.post('/dues/:id/receive', authorize(...MANAGE), validate(receiveDueValidator), contributionController.receiveDue);
router.post('/dues/:id/apply-credit', authorize(...MANAGE), validate(applyCreditValidator), contributionController.applyCredit);
router.post('/members/:memberId/credit', authorize(...MANAGE), validate(grantCreditValidator), contributionController.grantCredit);
router.post('/members/:memberId/loan/repay', authorize(...MANAGE), validate(repayLoanValidator), contributionController.repayLoan);
router.get('/dues/:id/attachments', contributionController.listAttachments);
router.post(
  '/dues/:id/attachments',
  authorize(...MANAGE),
  uploadLimiter,
  singleUpload('contributions'),
  contributionController.addAttachment
);
router.delete(
  '/dues/:id/attachments/:attachmentId',
  authorize(...MANAGE),
  contributionController.deleteAttachment
);

export default router;
