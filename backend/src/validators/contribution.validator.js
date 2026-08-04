import { body } from 'express-validator';

export const generateBatchValidator = [
  body('month').isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
  body('year').isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),
  body('default_amount').optional().isFloat({ min: 0.01 }).withMessage('Invalid due amount'),
];

export const receiveDueValidator = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('paid_date').optional().isISO8601().withMessage('Invalid paid date'),
];
