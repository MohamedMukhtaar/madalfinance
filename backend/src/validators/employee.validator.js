import { body } from 'express-validator';

const optionalId = (field) =>
  body(field).optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage(`Invalid ${field}`);

export const createEmployeeValidator = [
  body('first_name').trim().notEmpty().withMessage('First name is required').isLength({ max: 100 }),
  body('last_name').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('gender').optional({ nullable: true }).trim().isLength({ max: 20 }),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid email address'),
  body('address').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('job_title').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('department').optional({ nullable: true }).trim().isLength({ max: 100 }),
  optionalId('job_title_id'),
  optionalId('department_id'),
  optionalId('branch_id'),
  optionalId('shift_id'),
  body('hire_date').optional().isISO8601().withMessage('Invalid hire date'),
  body('basic_salary').optional().isFloat({ min: 0 }).withMessage('Invalid basic salary'),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 2000 }),
];

export const updateEmployeeValidator = [
  body('first_name').optional().trim().notEmpty().withMessage('First name is required').isLength({ max: 100 }),
  body('last_name').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('gender').optional({ nullable: true }).trim().isLength({ max: 20 }),
  body('phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Invalid email address'),
  body('address').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('job_title').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('department').optional({ nullable: true }).trim().isLength({ max: 100 }),
  optionalId('job_title_id'),
  optionalId('department_id'),
  optionalId('branch_id'),
  optionalId('shift_id'),
  body('hire_date').optional().isISO8601().withMessage('Invalid hire date'),
  body('basic_salary').optional().isFloat({ min: 0 }).withMessage('Invalid basic salary'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 2000 }),
];
