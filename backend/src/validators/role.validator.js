import { body, param } from 'express-validator';

export const createRoleValidator = [
  body('role_name').trim().notEmpty().withMessage('Role name is required').isLength({ max: 50 }),
];

export const updateRoleValidator = [
  param('roleId').isInt({ min: 1 }),
  body('role_name').trim().notEmpty().withMessage('Role name is required').isLength({ max: 50 }),
];

export const roleIdValidator = [param('roleId').isInt({ min: 1 })];
