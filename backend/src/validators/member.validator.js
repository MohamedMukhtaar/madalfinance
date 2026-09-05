import { body } from 'express-validator';

export const createMemberValidator = [
  body('full_name').trim().notEmpty().withMessage('Full name is required').isLength({ max: 100 }),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('email').optional({ values: 'falsy', nullable: true }).isEmail().withMessage('Invalid email address'),
  body('position').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('job_title_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Invalid title'),
  body('default_monthly_due').optional().isFloat({ min: 0 }).withMessage('Invalid default due'),
  body('joined_date').optional().isISO8601().withMessage('Invalid joined date'),
];

export const updateMemberValidator = [
  body('full_name').optional().trim().notEmpty().withMessage('Full name is required').isLength({ max: 100 }),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('email').optional({ values: 'falsy', nullable: true }).isEmail().withMessage('Invalid email address'),
  body('position').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('job_title_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Invalid title'),
  body('default_monthly_due').optional().isFloat({ min: 0 }).withMessage('Invalid default due'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  body('joined_date').optional().isISO8601().withMessage('Invalid joined date'),
];
