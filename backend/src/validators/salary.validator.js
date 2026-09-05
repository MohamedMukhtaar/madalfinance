import { body } from 'express-validator';
import { PAYMENT_METHODS } from '../utils/constants.js';

export const createSalaryChargeValidator = [
  body('employee_id').isInt({ min: 1 }).withMessage('Employee is required'),
  body('year').optional().isInt({ min: 2000, max: 2100 }),
  body('month').optional().isInt({ min: 1, max: 12 }),
  body('salary_period').optional().isISO8601().withMessage('Invalid salary period'),
  body('basic_salary').optional().isFloat({ min: 0 }),
  body('allowance').optional().isFloat({ min: 0 }),
  body('deduction').optional().isFloat({ min: 0 }),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 2000 }),
];

export const generateSalaryChargesValidator = [
  body('year').optional().isInt({ min: 2000, max: 2100 }),
  body('month').optional().isInt({ min: 1, max: 12 }),
  body('salary_period').optional().isISO8601(),
];

export const paySalaryValidator = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('account_id').optional().isInt({ min: 1 }),
  body('acc_id').optional().isInt({ min: 1 }),
  body('payment_method').optional().isIn([...PAYMENT_METHODS]),
  body('method').optional().isIn([...PAYMENT_METHODS]),
  body('payment_date').optional().isISO8601(),
  body('reference_number').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 2000 }),
];
