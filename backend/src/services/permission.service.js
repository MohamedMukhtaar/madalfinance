import permissionRepo from '../repositories/permission.repo.js';
import { ALL_PERMISSIONS, ALL_PERMISSION_NAMES, permissionCatalog } from '../utils/permissions.js';
import { ROLES } from '../utils/constants.js';

const cache = new Map();
const TTL_MS = 15_000;

export const invalidatePermissionCache = (userId) => {
  if (userId) cache.delete(Number(userId));
  else cache.clear();
};

export const permissionsForUser = async (userId, roleName) => {
  const id = Number(userId);
  const hit = cache.get(id);
  if (hit && hit.exp > Date.now()) return hit.names;

  let names = [];
  try {
    names = await permissionRepo.namesForUser(null, id);
  } catch {
    names = [];
  }
  if (roleName === ROLES.SUPER_ADMIN) {
    names = ALL_PERMISSION_NAMES;
  }
  cache.set(id, { names, exp: Date.now() + TTL_MS });
  return names;
};

export const catalog = () => ({
  catalog: permissionCatalog(),
  permissions: ALL_PERMISSIONS,
});

export const presentUser = async (user) => {
  if (!user) return user;
  const permissions = await permissionsForUser(user.user_id, user.role);
  return { ...user, permissions };
};

export default {
  invalidatePermissionCache,
  permissionsForUser,
  catalog,
  presentUser,
};
