import { body } from 'express-validator';

export const loginValidator = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const refreshValidator = [
  body('refresh_token').notEmpty().withMessage('Refresh token is required'),
];

export const changePasswordValidator = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
];

export const changeUsernameValidator = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3–50 characters')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Username may only contain letters, numbers, dots, dashes and underscores'),
];

export const updateProfileValidator = [
  body('full_name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Full name is too short'),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Invalid email address'),
];
