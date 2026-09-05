import { normalizeDates } from './serialize.js';

/**
 * Standard success envelope used by every controller.
 */
export const success = (res, data = null, message = 'Success', statusCode = 200, meta = null) =>
  res.status(statusCode).json({
    success: true,
    message,
    data: normalizeDates(data),
    meta: normalizeDates(meta),
  });

export default { success };
