import { body, param } from 'express-validator';
import { lookupKinds } from '../repositories/hrLookup.repo.js';

export const lookupKindParam = [
  param('kind').isIn(lookupKinds).withMessage('Unknown organization type'),
];

export const createLookupValidator = [
  ...lookupKindParam,
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('status').optional().isIn(['active', 'inactive']),
  body('start_time').optional({ nullable: true, checkFalsy: true }).matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid start time'),
  body('end_time').optional({ nullable: true, checkFalsy: true }).matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid end time'),
];

export const updateLookupValidator = [
  ...lookupKindParam,
  body('name').optional().trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('notes').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('status').optional().isIn(['active', 'inactive']),
  body('start_time').optional({ nullable: true, checkFalsy: true }).matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid start time'),
  body('end_time').optional({ nullable: true, checkFalsy: true }).matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Invalid end time'),
];
