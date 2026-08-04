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
    return next(ApiError.unprocessable('Validation failed', messages));
  },
];

export default validate;
