import { body, param } from 'express-validator';

export const createTaskValidator = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 5000 }),
  body('priority').optional().isIn(['Low', 'Medium', 'High']).withMessage('Invalid priority'),
  body('status').optional().isIn(['Todo', 'In Progress', 'Done', 'Cancelled']).withMessage('Invalid status'),
  body('due_date').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid due date'),
  body('assignee_type').isIn(['employee', 'member']).withMessage('Assign to an employee or member'),
  body('employee_id').optional({ values: 'falsy' }).isInt({ min: 1 }),
  body('member_id').optional({ values: 'falsy' }).isInt({ min: 1 }),
  body('employee_ids').optional().isArray({ min: 1 }).withMessage('Select at least one employee'),
  body('employee_ids.*').optional().isInt({ min: 1 }),
  body('member_ids').optional().isArray({ min: 1 }).withMessage('Select at least one member'),
  body('member_ids.*').optional().isInt({ min: 1 }),
];

export const updateTaskValidator = [
  param('id').isInt({ min: 1 }),
  body('title').optional().trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').optional({ values: 'null' }).trim().isLength({ max: 5000 }),
  body('priority').optional().isIn(['Low', 'Medium', 'High']),
  body('status').optional().isIn(['Todo', 'In Progress', 'Done', 'Cancelled']),
  body('due_date').optional({ values: 'null' }).isISO8601().withMessage('Invalid due date'),
  body('assignee_type').optional().isIn(['employee', 'member']),
  body('employee_id').optional({ values: 'null' }).isInt({ min: 1 }),
  body('member_id').optional({ values: 'null' }).isInt({ min: 1 }),
];
