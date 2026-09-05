import { body } from 'express-validator';

export const createProjectValidator = [
  body('customer_id').isInt({ min: 1 }).withMessage('Valid customer is required'),
  body('template_id').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Valid registered project is required'),
  body('project_type')
    .optional({ checkFalsy: true })
    .isIn(['One Time', 'Rental'])
    .withMessage('Project type must be One Time or Rental'),
  body('project_name').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  body('project_price').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Valid project price is required'),
  body('monthly_amount').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Valid monthly rent is required'),
  body('setup_fee').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Valid setup fee is required'),
  body('discount').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('Discount cannot be negative'),
  body('billing_day').optional({ values: 'null' }).isInt({ min: 1, max: 28 }).withMessage('Billing day must be 1–28'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('start_date').optional({ values: 'null' }).isISO8601().withMessage('Invalid start date'),
  body('expected_finish').optional({ values: 'null' }).isISO8601().withMessage('Invalid expected finish date'),
  body('status')
    .optional()
    .isIn(['Pending', 'In Progress', 'Completed', 'Cancelled'])
    .withMessage('Invalid project status'),
  body().custom((_, { req }) => {
    if (req.body.template_id) return true;
    const type = req.body.project_type;
    if (!type) throw new Error('Select a registered project');
    if (!String(req.body.project_name || '').trim()) throw new Error('Project name is required');
    if (type === 'One Time') {
      const price = Number(req.body.project_price);
      if (!Number.isFinite(price) || price < 0) {
        throw new Error('Project price is required for one-time projects');
      }
    }
    if (type === 'Rental') {
      const monthly = Number(req.body.monthly_amount);
      if (!Number.isFinite(monthly) || monthly < 0.01) {
        throw new Error('Monthly rent is required for rental projects');
      }
      const billingDay = Number(req.body.billing_day ?? 1);
      if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 28) {
        throw new Error('Billing day must be between 1 and 28');
      }
    }
    return true;
  }),
];

export const updateProjectValidator = [
  body('project_name').optional().trim().notEmpty().withMessage('Project name is required').isLength({ max: 150 }),
  body('project_price').optional().isFloat({ min: 0 }).withMessage('Valid project price is required'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('start_date').optional({ values: 'null' }).isISO8601().withMessage('Invalid start date'),
  body('expected_finish').optional({ values: 'null' }).isISO8601().withMessage('Invalid expected finish date'),
  body('completed_date').optional({ values: 'null' }).isISO8601().withMessage('Invalid completed date'),
  body('status')
    .optional()
    .isIn(['Pending', 'In Progress', 'Completed', 'Cancelled'])
    .withMessage('Invalid project status'),
];
