import { body } from 'express-validator';

export const createExpenseValidator = [
  body('expense_category_id').isInt({ min: 1 }).withMessage('Valid expense category is required'),
  body('expense_date').isISO8601().withMessage('Invalid expense date'),
  body('description').optional().trim().isLength({ max: 255 }),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('paid_by').optional({ nullable: true }).trim().isLength({ max: 100 }).withMessage('Invalid payer'),
  body('payment_method')
    .optional()
    .isIn(['Cash', 'Bank', 'EVC Plus', 'eDahab', 'Premier Wallet', 'Other'])
    .withMessage('Invalid payment method'),
  body('reference_number').optional().trim().isLength({ max: 50 }),
  body('notes').optional().trim().isLength({ max: 500 }),
  body('acc_id').optional().isInt({ min: 1 }).withMessage('Invalid account'),
];

export const updateExpenseValidator = [
  body('expense_category_id').optional().isInt({ min: 1 }).withMessage('Invalid expense category'),
  body('expense_date').optional().isISO8601().withMessage('Invalid expense date'),
  body('description').optional().trim().isLength({ max: 255 }),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Invalid amount'),
  body('paid_by').optional({ nullable: true }).trim().isLength({ max: 100 }).withMessage('Invalid payer'),
  body('payment_method')
    .optional()
    .isIn(['Cash', 'Bank', 'EVC Plus', 'eDahab', 'Premier Wallet', 'Other'])
    .withMessage('Invalid payment method'),
  body('reference_number').optional().trim().isLength({ max: 50 }),
  body('notes').optional().trim().isLength({ max: 500 }),
];

export const createCategoryValidator = [
  body('name').trim().notEmpty().withMessage('Category name is required').isLength({ max: 100 }),
];
