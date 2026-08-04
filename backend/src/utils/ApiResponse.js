/**
 * Standard success envelope used by every controller.
 */
export const success = (res, data = null, message = 'Success', statusCode = 200, meta = null) =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });

export default { success };
