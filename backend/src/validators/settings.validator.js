import { body, query } from 'express-validator';

export const updateSettingsValidator = [
  body('company_name').optional().trim().notEmpty().withMessage('Company name is required').isLength({ max: 150 }),
  body('company_phone').optional({ values: 'falsy' }).trim().isLength({ max: 30 }),
  body('company_email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email address'),
  body('company_address').optional({ values: 'falsy' }).trim().isLength({ max: 255 }),
  body('currency').optional().trim().isLength({ max: 10 }),
  body('default_member_due').optional().isFloat({ min: 0 }).withMessage('Invalid default member due'),
  body('invoice_prefix').optional().trim().isLength({ min: 1, max: 10 }),
  body('payment_prefix').optional().trim().isLength({ min: 1, max: 10 }),
  body('contract_prefix').optional().trim().isLength({ min: 1, max: 10 }),
  body('timezone').optional().trim().isLength({ max: 60 }),
];

export const reportQueryValidator = [
  query('from_date').optional().isISO8601().withMessage('Invalid from_date'),
  query('to_date').optional().isISO8601().withMessage('Invalid to_date'),
  query('months').optional().isInt({ min: 1, max: 60 }).withMessage('Invalid months'),
  query('format').optional().isIn(['pdf', 'xlsx']).withMessage('Format must be pdf or xlsx'),
];
