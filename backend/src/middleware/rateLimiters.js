import rateLimit from 'express-rate-limit';

const limiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message, errors: [] },
    handler: (req, res) => res.status(429).json({ success: false, message, errors: [] }),
  });

/** Global API throttle. */
export const apiLimiter = limiter(15 * 60 * 1000, 500, 'Too many requests, please try again later');

/** Login brute-force protection. */
export const authLimiter = limiter(15 * 60 * 1000, 20, 'Too many login attempts, please try again in 15 minutes');

/** Refresh token abuse protection. */
export const refreshLimiter = limiter(60 * 1000, 30, 'Too many token refresh attempts');

/** File upload throttle. */
export const uploadLimiter = limiter(60 * 1000, 30, 'Too many uploads, please slow down');
