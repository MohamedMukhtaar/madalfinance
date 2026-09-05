import { body } from 'express-validator';

export const createUserValidator = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3–50 characters'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('role').trim().notEmpty().withMessage('Role is required'),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('email').optional({ values: 'falsy', nullable: true }).trim().isEmail().withMessage('Invalid email'),
  body('status').optional().isIn(['active', 'inactive']),
];

export const updateUserValidator = [
  body('username').optional().trim().isLength({ min: 3, max: 50 }),
  body('password').optional().isLength({ min: 8 }),
  body('full_name').optional().trim().notEmpty(),
  body('role').optional().trim().notEmpty(),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('email').optional({ values: 'falsy', nullable: true }).trim().isEmail().withMessage('Invalid email'),
  body('status').optional().isIn(['active', 'inactive']),
];
