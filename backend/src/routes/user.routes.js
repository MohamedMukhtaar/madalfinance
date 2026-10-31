import { Router } from 'express';
import userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { singleUpload } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { createMemberValidator, updateMemberValidator } from '../validators/member.validator.js';
import { createUserValidator, updateUserValidator } from '../validators/user.validator.js';
import {
  createRoleValidator,
  updateRoleValidator,
  roleIdValidator,
  assignPermissionsValidator,
} from '../validators/role.validator.js';

const router = Router();

router.use(authenticate);

router.get('/members', authorize('view members'), userController.listMembers);
router.post('/members', authorize('create members'), validate(createMemberValidator), userController.createMember);
router.put(
  '/members/:id',
  authorize('edit members'),
  validate(updateMemberValidator),
  userController.updateMember
);
router.post(
  '/members/:id/avatar',
  authorize('edit members'),
  uploadLimiter,
  singleUpload('members'),
  userController.uploadMemberAvatar
);
router.delete('/members/:id', authorize('delete members'), userController.deactivateMember);

router.get('/', authorize('view users'), userController.listUsers);
router.get('/roles/permissions', authorize('view roles'), userController.permissionCatalog);
router.get('/roles', authorize('view roles'), userController.listRoles);
router.post('/roles', authorize('create roles'), validate(createRoleValidator), userController.createRole);
router.put('/roles/:roleId', authorize('edit roles'), validate(updateRoleValidator), userController.updateRole);
router.post(
  '/roles/:roleId/permissions',
  authorize('edit roles'),
  validate(assignPermissionsValidator),
  userController.assignRolePermissions
);
router.delete('/roles/:roleId', authorize('delete roles'), validate(roleIdValidator), userController.deleteRole);
router.get('/audit-logs', authorize('view logs'), userController.listAuditLogs);
router.post('/', authorize('create users'), validate(createUserValidator), userController.createUser);
router.get('/:id', authorize('view users'), userController.getUser);
router.put('/:id', authorize('edit users'), validate(updateUserValidator), userController.updateUser);
router.post(
  '/:id/avatar',
  authorize('edit users'),
  uploadLimiter,
  singleUpload('users'),
  userController.uploadUserAvatar
);
router.get('/:id/devices', authorize('view users'), userController.listUserDevices);
router.delete('/:id/devices/:deviceId', authorize('edit users'), userController.removeUserDevice);
router.delete('/:id', authorize('delete users'), userController.deactivateUser);

export default router;
