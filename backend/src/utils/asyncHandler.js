/**
 * Wraps an async route handler so thrown errors are forwarded
 * to the centralized error middleware (no try/catch in controllers).
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
