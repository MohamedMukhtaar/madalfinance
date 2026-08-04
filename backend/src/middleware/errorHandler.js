import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import env from '../config/index.js';

/**
 * Centralized error handler. All errors end here.
 * - Operational ApiErrors return their status/message/errors.
 * - Unknown errors are logged and returned as 500 (no stack leak).
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  if (err instanceof SyntaxError && err.status === 400) {
    status = 400;
    message = 'Invalid JSON payload';
  }

  if (err?.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'A record with the same unique value already exists';
  } else if (err?.code === 'ER_NO_REFERENCED_ROW_2' || err?.code === 'ER_NO_REFERENCED_ROW') {
    status = 400;
    message = 'Referenced record does not exist';
  } else if (err?.code === 'ER_ROW_IS_REFERENCED_2' || err?.code === 'ER_ROW_IS_REFERENCED') {
    status = 400;
    message = 'Record is in use and cannot be deleted';
  }

  if (status >= 500) {
    logger.error(err);
  }

  const payload = { success: false, message, errors };
  if (env.nodeEnv !== 'production' && status >= 500) {
    payload.stack = err.stack;
  }
  return res.status(status).json(payload);
};

export default errorHandler;
