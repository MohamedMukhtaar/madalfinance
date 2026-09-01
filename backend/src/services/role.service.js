import roleRepo from '../repositories/role.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { ROLES } from '../utils/constants.js';

const PROTECTED_ROLES = new Set([ROLES.SUPER_ADMIN, ROLES.ADMIN]);

export const roleService = {
  async list() {
    return roleRepo.list(null);
  },

  async getById(id) {
    const role = await roleRepo.findById(null, id);
    if (!role) throw ApiError.notFound('Role not found');
    return role;
  },

  async create(data, actorId, ip) {
    return withTransaction(async (conn) => {
      const roleName = String(data.role_name || '').trim();
      if (!roleName) throw ApiError.badRequest('Role name is required');
      if (roleName.length > 50) throw ApiError.badRequest('Role name must be 50 characters or less');
      if (await roleRepo.nameExists(conn, roleName)) {
        throw ApiError.conflict('Role name is already taken');
      }

      const roleId = await roleRepo.create(conn, roleName);
      await auditService.log({ module: 'Role', action: 'CREATE', userId: actorId, recordId: roleId, ip });
      return roleRepo.findById(conn, roleId);
    });
  },

  async update(id, data, actorId, ip) {
    return withTransaction(async (conn) => {
      const role = await roleRepo.findById(conn, id);
      if (!role) throw ApiError.notFound('Role not found');

      const roleName = String(data.role_name || '').trim();
      if (!roleName) throw ApiError.badRequest('Role name is required');
      if (roleName.length > 50) throw ApiError.badRequest('Role name must be 50 characters or less');
      if (PROTECTED_ROLES.has(role.role_name) && roleName !== role.role_name) {
        throw ApiError.badRequest('Built-in roles cannot be renamed');
      }
      if (await roleRepo.nameExists(conn, roleName, id)) {
        throw ApiError.conflict('Role name is already taken');
      }

      await roleRepo.update(conn, id, roleName);
      await auditService.log({ module: 'Role', action: 'UPDATE', userId: actorId, recordId: id, ip });
      return roleRepo.findById(conn, id);
    });
  },

  async remove(id, actorId, ip) {
    return withTransaction(async (conn) => {
      const role = await roleRepo.findById(conn, id);
      if (!role) throw ApiError.notFound('Role not found');
      if (PROTECTED_ROLES.has(role.role_name)) {
        throw ApiError.badRequest('Built-in roles cannot be deleted');
      }

      const userCount = await roleRepo.countUsers(conn, id);
      if (userCount > 0) {
        throw ApiError.badRequest('Cannot delete a role that is assigned to users');
      }

      await roleRepo.remove(conn, id);
      await auditService.log({ module: 'Role', action: 'DELETE', userId: actorId, recordId: id, ip });
      return { role_id: id, deleted: true };
    });
  },
};

export default roleService;
