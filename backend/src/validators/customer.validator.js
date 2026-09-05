import { body } from 'express-validator';

export const createCustomerValidator = [
  body('customer_name').trim().notEmpty().withMessage('Customer name is required').isLength({ max: 150 }),
  body('company_name').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^[+0-9 ()-]{7,20}$/)
    .withMessage('Enter a valid phone number'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email address'),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 255 }),
  body('city').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid customer status'),
];

export const updateCustomerValidator = [
  body('customer_name').optional().trim().notEmpty().withMessage('Customer name is required').isLength({ max: 150 }),
  body('company_name').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[+0-9 ()-]{7,20}$/)
    .withMessage('Enter a valid phone number'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Enter a valid email address'),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 255 }),
  body('city').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid customer status'),
];

export const addContactValidator = [
  body('name').trim().notEmpty().withMessage('Contact name is required').isLength({ max: 100 }),
  body('position').optional().trim().isLength({ max: 100 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('email').optional().isEmail().withMessage('Invalid email address'),
];
