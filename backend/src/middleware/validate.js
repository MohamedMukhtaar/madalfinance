import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/**
 * Runs express-validator chains then returns a standardized
 * 422 validation error response when any check fails.
 */
export const validate = (validations) => [
  ...validations,
  (req, _res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    const messages = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
      value: e.value,
    }));
    const summary =
      messages.map((m) => m.message).filter(Boolean).join('. ') ||
      'Please fix the highlighted fields and try again.';
    return next(ApiError.unprocessable(summary, messages));
  },
];

export default validate;
