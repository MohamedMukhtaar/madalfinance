import type { Response } from 'express';
import normalizeDates from './serialize.js';

/**
 * Standard success envelope used by every controller.
 *
 * Every payload passes through normalizeDates so timestamps keep the
 * 'YYYY-MM-DD HH:mm:ss' shape the frontend already parses, and Sequelize
 * model instances are flattened to plain objects.
 */
export const success = (
  res: Response,
  data: unknown = null,
  message = 'Success',
  statusCode = 200,
  meta: unknown = null
): Response =>
  res.status(statusCode).json({
    success: true,
    message,
    data: normalizeDates(data),
    meta,
  });

export default { success };
