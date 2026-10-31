import ApiError from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';

const looksLikePermission = (value) => typeof value === 'string' && /\s/.test(value);

/**
 * Role or permission based access control.
 *
 * Usage:
 *   authorize('Super Admin', 'Admin')          // role names (legacy)
 *   authorize('view invoices')                 // Spatie-style permission
 *   authorize('edit invoices', 'create invoices')
 *
 * Super Admin always passes so the account cannot be locked out.
 */
export const authorize =
  (...allowed) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.role === ROLES.SUPER_ADMIN) return next();

    const permissionChecks = allowed.filter(looksLikePermission);
    const roleChecks = allowed.filter((a) => !looksLikePermission(a));

    if (roleChecks.length && roleChecks.includes(req.user.role)) return next();

    const owned = Array.isArray(req.user.permissions) ? req.user.permissions : [];
    if (permissionChecks.length && permissionChecks.some((p) => owned.includes(p))) {
      return next();
    }

    return next(ApiError.forbidden('You do not have permission to perform this action'));
  };

export default authorize;
