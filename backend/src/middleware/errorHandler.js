import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import env from '../config/index.js';

const GENERIC_500 = 'Something went wrong. Please try again.';

/** Detect developer/runtime text that must never reach the UI. */
const looksTechnical = (msg) => {
  if (!msg || typeof msg !== 'string') return true;
  if (msg.length > 220) return true;
  return /is not a function|cannot read propert|cannot set propert|undefined is not|null is not an object|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up|unexpected token|SyntaxError|TypeError|ReferenceError|RangeError|at Object\.|at Module\.|at async |node:internal|postgres|EPERM|ENOENT|SQLITE_|sequelize|knex|multer|jwt malformed|invalid signature|JsonWebToken/i.test(
    msg
  );
};

/**
 * Centralized error handler. All errors end here.
 * - Operational ApiErrors return their status/message/errors (safe, authored text).
 * - DB / upload / auth infrastructure errors are mapped to clear human messages.
 * - Unknown errors are logged; clients always get a friendly message (no stack leak).
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let status = 500;
  let message = GENERIC_500;
  let errors = [];

  const operational = err instanceof ApiError || err?.isOperational === true;

  if (operational) {
    status = err.statusCode || 500;
    message = err.message || GENERIC_500;
    errors = Array.isArray(err.errors) ? err.errors : [];
  }

  if (err instanceof SyntaxError && err.status === 400) {
    status = 400;
    message = 'The request data is invalid. Please check and try again.';
  }

  if (err?.name === 'MulterError' || err?.code === 'LIMIT_FILE_SIZE') {
    status = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'The file is too large. Please upload a smaller file.'
        : 'The file could not be uploaded. Please try a different file.';
  } else if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    status = 401;
    message =
      err.name === 'TokenExpiredError'
        ? 'Your session has expired. Please sign in again.'
        : 'Please sign in again to continue.';
  } else if (err?.code === 'ER_DUP_ENTRY' || err?.code === '23505') {
    status = 409;
    message = 'A record with the same unique value already exists.';
  } else if (
    err?.code === '23503' ||
    err?.code === 'ER_NO_REFERENCED_ROW_2' ||
    err?.code === 'ER_NO_REFERENCED_ROW' ||
    err?.code === 'ER_ROW_IS_REFERENCED_2' ||
    err?.code === 'ER_ROW_IS_REFERENCED'
  ) {
    status = 400;
    const inUse = /still referenced|update or delete/i.test(`${err?.detail || ''} ${err?.message || ''}`);
    message = inUse
      ? 'This record is in use and cannot be deleted.'
      : 'A related record is missing. Please check your selection.';
  } else if (err?.code === '23514' || err?.code === '23P01') {
    status = 400;
    message = 'The data does not meet the required rules. Please check and try again.';
  } else if (err?.code === 'P0001') {
    // Intentionally raised DB messages — only pass through if they look human.
    status = 400;
    const raised = String(err.message || '').replace(/^ERROR:\s*/i, '').split('\n')[0].trim();
    message = raised && !looksTechnical(raised) ? raised : 'The data does not meet the required rules.';
  } else if (err?.code === '22P02' || err?.code === '22001' || err?.code === '22003') {
    status = 400;
    message = 'Please check your input values and try again.';
  } else if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND' || err?.code === 'ETIMEDOUT') {
    status = 503;
    message = 'A required service is temporarily unavailable. Please try again shortly.';
  }

  // Never surface raw runtime/DB text for unexpected failures.
  if ((!operational && status >= 500) || looksTechnical(message)) {
    if (status >= 500) message = GENERIC_500;
    else if (looksTechnical(message)) {
      message =
        status === 400
          ? 'Please check your input and try again.'
          : status === 401
            ? 'Please sign in again to continue.'
            : status === 403
              ? 'You do not have permission to do that.'
              : status === 404
                ? 'The requested item was not found.'
                : status === 409
                  ? 'This conflicts with an existing record.'
                  : GENERIC_500;
    }
  }

  if (status >= 500 || !operational) {
    logger.error(err);
  } else if (status >= 400) {
    logger.warn?.(err?.message || message);
  }

  const payload = { success: false, message, errors };
  // Stack is for server logs / local debugging only — never put technical message text here for UI.
  if (env.nodeEnv !== 'production' && status >= 500) {
    payload.debug = err?.message || undefined;
  }
  return res.status(status).json(payload);
};

export default errorHandler;
