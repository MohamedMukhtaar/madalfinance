import { body } from 'express-validator';

const typeRule = body('project_type')
  .trim()
  .notEmpty()
  .withMessage('Project type is required')
  .isIn(['One Time', 'Rental'])
  .withMessage('Project type must be One Time or Rental');

export const createTemplateValidator = [
  body('template_name').trim().notEmpty().withMessage('Project name is required').isLength({ max: 200 }),
  typeRule,
  body('description').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('project_price').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('monthly_amount').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('setup_fee').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('billing_day').optional({ values: 'null' }).isInt({ min: 1, max: 28 }),
  body('status').optional().isIn(['active', 'inactive']),
  body().custom((_, { req }) => {
    if (req.body.project_type === 'One Time') {
      const price = Number(req.body.project_price);
      if (!Number.isFinite(price) || price < 0.01) {
        throw new Error('Project price is required for one-time projects');
      }
    }
    if (req.body.project_type === 'Rental') {
      const monthly = Number(req.body.monthly_amount);
      if (!Number.isFinite(monthly) || monthly < 0.01) {
        throw new Error('Monthly rent is required for rental projects');
      }
    }
    return true;
  }),
];

export const updateTemplateValidator = [
  body('template_name').optional().trim().notEmpty().withMessage('Project name is required').isLength({ max: 200 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('project_price').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('monthly_amount').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('setup_fee').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('billing_day').optional({ values: 'null' }).isInt({ min: 1, max: 28 }),
  body('status').optional().isIn(['active', 'inactive']),
];
