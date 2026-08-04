import { body } from 'express-validator';

export const createRentalValidator = [
  body('project_id').isInt({ min: 1 }).withMessage('Valid project is required'),
  body('monthly_amount').isFloat({ min: 0.01 }).withMessage('Valid monthly amount is required'),
  body('billing_day').isInt({ min: 1, max: 28 }).withMessage('Billing day must be 1–28'),
  body('next_billing_date').optional().isISO8601().withMessage('Invalid next billing date'),
];

export const updateRentalValidator = [
  body('monthly_amount').optional().isFloat({ min: 0.01 }).withMessage('Invalid monthly amount'),
  body('billing_day').optional().isInt({ min: 1, max: 28 }).withMessage('Billing day must be 1–28'),
  body('next_billing_date').optional().isISO8601().withMessage('Invalid next billing date'),
];

export const setRentalStatusValidator = [
  body('status').isIn(['Active', 'Paused', 'Expired']).withMessage('Invalid rental status'),
];
