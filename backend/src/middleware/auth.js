import jwt from '../utils/jwt.js';
import ApiError from '../utils/ApiError.js';

/**
 * Verifies the Bearer access token and attaches the current user to req.user.
 */
export const authenticate = (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return next(ApiError.unauthorized('Authentication required'));
  }
  try {
    const payload = jwt.verifyAccess(token);
    req.user = {
      id: Number(payload.sub),
      username: payload.username,
      role: payload.role,
    };
    return next();
  } catch {
    return next(ApiError.unauthorized('Invalid or expired access token'));
  }
};

export default authenticate;
