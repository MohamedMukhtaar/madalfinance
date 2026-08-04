import { body } from 'express-validator';

export const createContractValidator = [
  body('customer_id').isInt({ min: 1 }).withMessage('Valid customer is required'),
  body('project_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Invalid project'),
  body('contract_date').isISO8601().withMessage('Invalid contract date'),
  body('start_date').optional().isISO8601().withMessage('Invalid start date'),
  body('end_date').optional().isISO8601().withMessage('Invalid end date'),
  body('contract_amount').isFloat({ min: 0 }).withMessage('Valid contract amount is required'),
  body('remarks').optional().trim().isLength({ max: 500 }),
  body('status').optional().isIn(['active', 'completed', 'terminated']).withMessage('Invalid contract status'),
];

export const updateContractValidator = [
  body('contract_date').optional().isISO8601().withMessage('Invalid contract date'),
  body('start_date').optional().isISO8601().withMessage('Invalid start date'),
  body('end_date').optional().isISO8601().withMessage('Invalid end date'),
  body('contract_amount').optional().isFloat({ min: 0 }).withMessage('Invalid contract amount'),
  body('remarks').optional().trim().isLength({ max: 500 }),
  body('status').optional().isIn(['active', 'completed', 'terminated']).withMessage('Invalid contract status'),
];
