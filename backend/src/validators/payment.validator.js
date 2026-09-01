import { body } from 'express-validator';

export const createPaymentValidator = [
  body('customer_id').isInt({ min: 1 }).withMessage('Valid customer is required'),
  body('payment_date').isISO8601().withMessage('Invalid payment date'),
  body('payment_method')
    .isIn(['Cash', 'Bank', 'EVC Plus', 'eDahab', 'Premier Wallet', 'Other'])
    .withMessage('Invalid payment method'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid payment amount is required'),
  body('reference_number').optional().trim().isLength({ max: 50 }),
  body('notes').optional().trim().isLength({ max: 500 }),
  body('allocations').isArray({ min: 1 }).withMessage('Allocate the payment to at least one invoice'),
  body('allocations.*.invoice_id').isInt({ min: 1 }).withMessage('Invalid invoice id'),
  body('allocations.*.amount').isFloat({ min: 0.01 }).withMessage('Invalid allocation amount'),
  body('acc_id').optional().isInt({ min: 1 }).withMessage('Invalid account'),
];

export const updatePaymentValidator = [
  body('payment_date').optional().isISO8601().withMessage('Invalid payment date'),
  body('payment_method')
    .optional()
    .isIn(['Cash', 'Bank', 'EVC Plus', 'eDahab', 'Premier Wallet', 'Other'])
    .withMessage('Invalid payment method'),
  body('reference_number').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
  body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Valid payment amount is required'),
  body('acc_id').optional().isInt({ min: 1 }).withMessage('Invalid account'),
];
