import { body } from 'express-validator';

export const createProjectValidator = [
  body('customer_id').isInt({ min: 1 }).withMessage('Valid customer is required'),
  body('project_type')
    .trim()
    .notEmpty()
    .withMessage('Project type is required')
    .isIn(['One Time', 'Rental'])
    .withMessage('Project type must be One Time or Rental'),
  body('project_name').trim().notEmpty().withMessage('Project name is required').isLength({ max: 150 }),
  body('project_price').isFloat({ min: 0 }).withMessage('Valid project price is required'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('start_date').optional().isISO8601().withMessage('Invalid start date'),
  body('expected_finish').optional().isISO8601().withMessage('Invalid expected finish date'),
  body('status')
    .optional()
    .isIn(['Pending', 'In Progress', 'Completed', 'Cancelled'])
    .withMessage('Invalid project status'),
];

export const updateProjectValidator = [
  body('project_name').optional().trim().notEmpty().withMessage('Project name is required').isLength({ max: 150 }),
  body('project_price').optional().isFloat({ min: 0 }).withMessage('Valid project price is required'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('start_date').optional().isISO8601().withMessage('Invalid start date'),
  body('expected_finish').optional().isISO8601().withMessage('Invalid expected finish date'),
  body('completed_date').optional().isISO8601().withMessage('Invalid completed date'),
  body('status')
    .optional()
    .isIn(['Pending', 'In Progress', 'Completed', 'Cancelled'])
    .withMessage('Invalid project status'),
];
