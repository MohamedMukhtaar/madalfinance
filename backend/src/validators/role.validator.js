import { body, param } from 'express-validator';

export const createRoleValidator = [
  body('role_name').trim().notEmpty().withMessage('Role name is required').isLength({ max: 50 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('permissions').optional().isArray(),
  body('permissions.*').optional().isString(),
];

export const updateRoleValidator = [
  param('roleId').isInt({ min: 1 }),
  body('role_name').optional().trim().notEmpty().isLength({ max: 50 }),
  body('description').optional({ nullable: true }).isString().isLength({ max: 255 }),
  body('permissions').optional().isArray(),
  body('permissions.*').optional().isString(),
];

export const assignPermissionsValidator = [
  param('roleId').isInt({ min: 1 }),
  body('permissions').isArray().withMessage('permissions must be an array'),
  body('permissions.*').isString(),
];

export const roleIdValidator = [param('roleId').isInt({ min: 1 })];
