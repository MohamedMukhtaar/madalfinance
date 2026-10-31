import roleRepo from '../repositories/role.repo.js';
import permissionRepo from '../repositories/permission.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { ROLES } from '../utils/constants.js';
import { ALL_PERMISSION_NAMES } from '../utils/permissions.js';
import { invalidatePermissionCache } from './permission.service.js';
import permissionService from './permission.service.js';

const PROTECTED_ROLES = new Set([ROLES.SUPER_ADMIN, ROLES.ADMIN]);

const permissionList = (body) => {
  const raw = body.permissions ?? body.permission_names;
  if (!Array.isArray(raw)) return null;
  return [...new Set(raw.map((p) => String(p).trim()).filter(Boolean))];
};

export const roleService = {
  async list() {
    return roleRepo.list(null);
  },

  async getById(id) {
    const role = await roleRepo.findById(null, id);
    if (!role) throw ApiError.notFound('Role not found');
    return role;
  },

  catalog() {
    return permissionService.catalog();
  },

  async create(data, actorId, ip) {
    return withTransaction(async (conn) => {
      const roleName = String(data.role_name || '').trim();
      if (!roleName) throw ApiError.badRequest('Role name is required');
      if (roleName.length > 50) throw ApiError.badRequest('Role name must be 50 characters or less');
      if (await roleRepo.nameExists(conn, roleName)) {
        throw ApiError.conflict('Role name is already taken');
      }

      const roleId = await roleRepo.create(conn, {
        roleName,
        description: data.description ?? null,
      });
      const perms = permissionList(data) || [];
      const unknown = perms.filter((p) => !ALL_PERMISSION_NAMES.includes(p));
      if (unknown.length) throw ApiError.badRequest(`Unknown permissions: ${unknown.join(', ')}`);
      await permissionRepo.replaceRolePermissions(conn, roleId, perms);
      await auditService.log({ module: 'Role', action: 'CREATE', userId: actorId, recordId: roleId, ip });
      invalidatePermissionCache();
      return roleRepo.findById(conn, roleId);
    });
  },

  async update(id, data, actorId, ip) {
    return withTransaction(async (conn) => {
      const role = await roleRepo.findById(conn, id);
      if (!role) throw ApiError.notFound('Role not found');

      const roleName = String(data.role_name || role.role_name).trim();
      if (!roleName) throw ApiError.badRequest('Role name is required');
      if (roleName.length > 50) throw ApiError.badRequest('Role name must be 50 characters or less');
      if (PROTECTED_ROLES.has(role.role_name) && roleName !== role.role_name) {
        throw ApiError.badRequest('Built-in roles cannot be renamed');
      }
      if (await roleRepo.nameExists(conn, roleName, id)) {
        throw ApiError.conflict('Role name is already taken');
      }

      await roleRepo.update(conn, id, {
        roleName,
        description: data.description !== undefined ? data.description : role.description,
      });

      const perms = permissionList(data);
      if (perms) {
        if (role.role_name === ROLES.SUPER_ADMIN) {
          await permissionRepo.replaceRolePermissions(conn, id, ALL_PERMISSION_NAMES);
        } else {
          const unknown = perms.filter((p) => !ALL_PERMISSION_NAMES.includes(p));
          if (unknown.length) throw ApiError.badRequest(`Unknown permissions: ${unknown.join(', ')}`);
          await permissionRepo.replaceRolePermissions(conn, id, perms);
        }
        invalidatePermissionCache();
      }

      await auditService.log({ module: 'Role', action: 'UPDATE', userId: actorId, recordId: id, ip });
      return roleRepo.findById(conn, id);
    });
  },

  async assignPermissions(id, permissionNames, actorId, ip) {
    return this.update(id, { permissions: permissionNames }, actorId, ip);
  },

  async remove(id, actorId, ip) {
    return withTransaction(async (conn) => {
      const role = await roleRepo.findById(conn, id);
      if (!role) throw ApiError.notFound('Role not found');
      if (PROTECTED_ROLES.has(role.role_name) || role.is_system) {
        throw ApiError.badRequest('Built-in roles cannot be deleted');
      }

      const userCount = await roleRepo.countUsers(conn, id);
      if (userCount > 0) {
        throw ApiError.badRequest('Cannot delete a role that is assigned to users');
      }

      await roleRepo.remove(conn, id);
      await auditService.log({ module: 'Role', action: 'DELETE', userId: actorId, recordId: id, ip });
      invalidatePermissionCache();
      return { role_id: id, deleted: true };
    });
  },
};

export default roleService;
