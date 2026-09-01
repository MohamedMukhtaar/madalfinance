import { body } from 'express-validator';

export const generateBatchValidator = [
  body('month').isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
  body('year').isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),
  body('default_amount').optional().isFloat({ min: 0.01 }).withMessage('Invalid due amount'),
];

export const receiveDueValidator = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('paid_date').optional().isISO8601().withMessage('Invalid paid date'),
  body('acc_id').optional().isInt({ min: 1 }).withMessage('Invalid account'),
];

export const grantCreditValidator = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid loan amount is required'),
  body('credit_date').optional().isISO8601().withMessage('Invalid loan date'),
  body('loan_date').optional().isISO8601().withMessage('Invalid loan date'),
  body('acc_id').optional().isInt({ min: 1 }).withMessage('Invalid account'),
  body('notes').optional().trim().isLength({ max: 500 }),
];

export const repayLoanValidator = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid repayment amount is required'),
  body('repay_date').optional().isISO8601().withMessage('Invalid repayment date'),
  body('acc_id').optional().isInt({ min: 1 }).withMessage('Invalid account'),
  body('notes').optional().trim().isLength({ max: 500 }),
];

export const applyCreditValidator = [
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Invalid amount'),
];
