import { body, param } from 'express-validator';

export const createAccountValidator = [
  body('number').trim().notEmpty().isLength({ max: 50 }).withMessage('Account number is required'),
  body('institution').trim().notEmpty().isLength({ max: 150 }).withMessage('Institution is required'),
  body('balance').optional().isFloat({ min: 0 }).withMessage('Opening balance must be zero or positive'),
  body('is_default').optional().isBoolean(),
];

export const updateAccountValidator = [
  param('id').isInt({ min: 1 }),
  body('number').trim().notEmpty().isLength({ max: 50 }),
  body('institution').trim().notEmpty().isLength({ max: 150 }),
];

export const transferValidator = [
  body('from_acc_id').isInt({ min: 1 }).withMessage('Source account is required'),
  body('to_acc_id').isInt({ min: 1 }).withMessage('Destination account is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('transfer_date').isISO8601().withMessage('Invalid transfer date'),
  body('notes').optional().trim().isLength({ max: 500 }),
];
