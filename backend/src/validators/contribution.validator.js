import { body } from 'express-validator';

export const generateBatchValidator = [
  body('reason').trim().notEmpty().withMessage('Give a reason for this charge').isLength({ max: 255 }),
  body('charge_date').optional().isISO8601().withMessage('Invalid charge date'),
  body('month').optional().isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
  body('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),
  body('default_amount').optional().isFloat({ min: 0.01 }).withMessage('Invalid due amount'),
  body('member_ids').optional().isArray().withMessage('member_ids must be a list'),
  body('member_ids.*').optional().isInt({ min: 1 }),
];

export const updateBatchValidator = [
  body('reason').optional().trim().notEmpty().withMessage('Reason cannot be empty').isLength({ max: 255 }),
  body('charge_date').optional().isISO8601().withMessage('Invalid charge date'),
];

export const updateDueValidator = [body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required')];

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
