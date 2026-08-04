import { body } from 'express-validator';

export const createCustomerValidator = [
  body('customer_name').trim().notEmpty().withMessage('Customer name is required').isLength({ max: 100 }),
  body('company_name').optional().trim().isLength({ max: 100 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('address').optional().trim().isLength({ max: 255 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid customer status'),
];

export const updateCustomerValidator = [
  body('customer_name').optional().trim().notEmpty().withMessage('Customer name is required').isLength({ max: 100 }),
  body('company_name').optional().trim().isLength({ max: 100 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('address').optional().trim().isLength({ max: 255 }),
  body('city').optional().trim().isLength({ max: 100 }),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid customer status'),
];

export const addContactValidator = [
  body('name').trim().notEmpty().withMessage('Contact name is required').isLength({ max: 100 }),
  body('position').optional().trim().isLength({ max: 100 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('email').optional().isEmail().withMessage('Invalid email address'),
];
