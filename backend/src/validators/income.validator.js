import { body } from 'express-validator';

export const createIncomeValidator = [
  body('category_name').optional().trim().isLength({ max: 50 }),
  body('description').optional().trim().isLength({ max: 255 }),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('income_date').isISO8601().withMessage('Invalid income date'),
  body('acc_id').optional().isInt({ min: 1 }).withMessage('Invalid account'),
  body('notes').optional().trim().isLength({ max: 500 }),
];

export const updateIncomeValidator = [
  body('category_name').optional().trim().isLength({ max: 50 }),
  body('description').optional().trim().isLength({ max: 255 }),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Invalid amount'),
  body('income_date').optional().isISO8601().withMessage('Invalid income date'),
  body('notes').optional().trim().isLength({ max: 500 }),
];
