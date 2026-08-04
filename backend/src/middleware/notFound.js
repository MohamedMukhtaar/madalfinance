import ApiError from '../utils/ApiError.js';

/** 404 handler for unmatched API routes. */
export const notFound = (req, _res, next) =>
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));

export default notFound;
