import { body } from 'express-validator';

export const createInvoiceValidator = [
  body('customer_id').isInt({ min: 1 }).withMessage('Valid customer is required'),
  body('project_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid project'),
  body('contract_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid contract'),
  body('invoice_date').isISO8601().withMessage('Invalid invoice date'),
  body('due_date').optional({ nullable: true }).isISO8601().withMessage('Invalid due date'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('Invalid discount'),
  body('tax').optional().isFloat({ min: 0 }).withMessage('Invalid tax'),
  body('status')
    .optional()
    .isIn(['Draft', 'Issued', 'Partial', 'Paid', 'Cancelled', 'Overdue'])
    .withMessage('Invalid invoice status'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.description').trim().notEmpty().withMessage('Item description is required').isLength({ max: 255 }),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Invalid quantity'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Invalid unit price'),
];

export const updateInvoiceValidator = [
  body('invoice_date').optional().isISO8601().withMessage('Invalid invoice date'),
  body('due_date').optional({ nullable: true }).isISO8601().withMessage('Invalid due date'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('Invalid discount'),
  body('tax').optional().isFloat({ min: 0 }).withMessage('Invalid tax'),
  body('items').optional().isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.description').trim().notEmpty().withMessage('Item description is required').isLength({ max: 255 }),
  body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Invalid quantity'),
  body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Invalid unit price'),
];

export const setInvoiceStatusValidator = [
  body('status')
    .isIn(['Draft', 'Issued', 'Partial', 'Paid', 'Cancelled', 'Overdue'])
    .withMessage('Invalid invoice status'),
];
