import jwt from '../utils/jwt.js';
import ApiError from '../utils/ApiError.js';
import { permissionsForUser } from '../services/permission.service.js';

/**
 * Verifies the Bearer access token and attaches the current user to req.user.
 */
export const authenticate = async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return next(ApiError.unauthorized('Authentication required'));
  }
  try {
    const payload = jwt.verifyAccess(token);
    const id = Number(payload.sub);
    const role = payload.role;
    const permissions = await permissionsForUser(id, role);
    req.user = {
      id,
      username: payload.username,
      role,
      permissions,
    };
    return next();
  } catch (err) {
    if (err?.statusCode) return next(err);
    return next(ApiError.unauthorized('Invalid or expired access token'));
  }
};

export default authenticate;
