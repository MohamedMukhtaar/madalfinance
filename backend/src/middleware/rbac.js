import ApiError from '../utils/ApiError.js';

/**
 * Role based access control.
 * Usage: router.get('/', authorize('Super Admin', 'Finance Admin'), handler)
 */
export const authorize =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    return next();
  };

export default authorize;
