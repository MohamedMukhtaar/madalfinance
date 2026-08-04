import { Router } from 'express';
import userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { singleUpload } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { ROLES } from '../utils/constants.js';
import { createMemberValidator, updateMemberValidator } from '../validators/member.validator.js';

const router = Router();
const MANAGE = [ROLES.SUPER_ADMIN, ROLES.FINANCE_ADMIN];

router.use(authenticate);

router.get('/', authorize(...MANAGE), userController.listUsers);
router.get('/audit-logs', authorize(...MANAGE), userController.listAuditLogs);

router.get('/members', authorize(...MANAGE), userController.listMembers);
router.post('/members', authorize(...MANAGE), validate(createMemberValidator), userController.createMember);
router.put(
  '/members/:id',
  authorize(...MANAGE),
  validate(updateMemberValidator),
  userController.updateMember
);
router.post(
  '/members/:id/avatar',
  authorize(...MANAGE),
  uploadLimiter,
  singleUpload('members'),
  userController.uploadMemberAvatar
);
router.delete('/members/:id', authorize(...MANAGE), userController.deactivateMember);

export default router;
