import { body } from 'express-validator';

export const createIncomeValidator = [
  body('income_category_id').isInt({ min: 1 }).withMessage('Valid income category is required'),
  body('description').optional().trim().isLength({ max: 255 }),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('income_date').isISO8601().withMessage('Invalid income date'),
  body('notes').optional().trim().isLength({ max: 500 }),
];

export const updateIncomeValidator = [
  body('income_category_id').optional().isInt({ min: 1 }).withMessage('Invalid income category'),
  body('description').optional().trim().isLength({ max: 255 }),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Invalid amount'),
  body('income_date').optional().isISO8601().withMessage('Invalid income date'),
  body('notes').optional().trim().isLength({ max: 500 }),
];

export const createIncomeCategoryValidator = [
  body('name').trim().notEmpty().withMessage('Category name is required').isLength({ max: 100 }),
];
