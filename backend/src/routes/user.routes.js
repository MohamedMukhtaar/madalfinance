import { Router } from 'express';
import userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { singleUpload } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { APP_ACCESS, MANAGE_ROLES, USER_MANAGEMENT } from '../utils/constants.js';
import { createMemberValidator, updateMemberValidator } from '../validators/member.validator.js';
import { createUserValidator, updateUserValidator } from '../validators/user.validator.js';
import { createRoleValidator, updateRoleValidator, roleIdValidator } from '../validators/role.validator.js';

const router = Router();
const MANAGE = MANAGE_ROLES;
const SUPER = USER_MANAGEMENT;

router.use(authenticate);

router.get('/members', authorize(...APP_ACCESS), userController.listMembers);
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

router.get('/', authorize(...SUPER), userController.listUsers);
router.get('/roles', authorize(...SUPER), userController.listRoles);
router.post('/roles', authorize(...SUPER), validate(createRoleValidator), userController.createRole);
router.put('/roles/:roleId', authorize(...SUPER), validate(updateRoleValidator), userController.updateRole);
router.delete('/roles/:roleId', authorize(...SUPER), validate(roleIdValidator), userController.deleteRole);
router.get('/audit-logs', authorize(...SUPER), userController.listAuditLogs);
router.post('/', authorize(...SUPER), validate(createUserValidator), userController.createUser);
router.get('/:id', authorize(...SUPER), userController.getUser);
router.put('/:id', authorize(...SUPER), validate(updateUserValidator), userController.updateUser);
router.delete('/:id', authorize(...SUPER), userController.deactivateUser);

export default router;
