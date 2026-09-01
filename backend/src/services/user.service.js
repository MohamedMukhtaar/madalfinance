import bcrypt from 'bcryptjs';
import userRepo from '../repositories/user.repo.js';
import roleRepo from '../repositories/role.repo.js';
import trashRepo from '../repositories/trash.repo.js';
import refreshTokenRepo from '../repositories/refreshToken.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { ROLES } from '../utils/constants.js';
import { requireDeleteReason } from '../helpers/deleteReason.js';

const resolveRoleId = async (conn, roleName) => {
  const role = await roleRepo.findByName(conn, roleName);
  if (!role) throw ApiError.badRequest(`Unknown role: ${roleName}`);
  return role.role_id;
};

const assertNotLastSuperAdmin = async (conn, userId, nextRole, nextStatus) => {
  const user = await userRepo.findById(conn, userId);
  if (!user) return;
  const demoting =
    user.role === ROLES.SUPER_ADMIN &&
    (nextRole !== ROLES.SUPER_ADMIN || nextStatus === 'inactive');
  if (!demoting) return;
  const count = await userRepo.countActiveByRole(conn, ROLES.SUPER_ADMIN);
  if (count <= 1) {
    throw ApiError.badRequest('Cannot remove or deactivate the last Super Admin');
  }
};

export const userService = {
  async list({ search, offset, perPage, order }) {
    const rows = await userRepo.list(null, { search, offset, perPage, order });
    const total = await userRepo.count(null, search);
    return { rows, total };
  },

  async getById(id) {
    const user = await userRepo.findById(null, id);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },

  async listRoles() {
    return roleRepo.list(null);
  },

  async create(data, actorId, ip) {
    return withTransaction(async (conn) => {
      const username = String(data.username || '').trim();
      const fullName = String(data.full_name || '').trim();
      const password = String(data.password || '');
      const roleName = data.role || ROLES.ADMIN;

      if (!username || username.length < 3) throw ApiError.badRequest('Username is required');
      if (!fullName) throw ApiError.badRequest('Full name is required');
      if (!password || password.length < 8) {
        throw ApiError.badRequest('Password must be at least 8 characters');
      }
      if (await userRepo.usernameExists(conn, username)) {
        throw ApiError.conflict('Username is already taken');
      }

      const roleId = await resolveRoleId(conn, roleName);
      const hash = await bcrypt.hash(password, 12);
      const userId = await userRepo.create(conn, {
        role_id: roleId,
        username,
        password: hash,
        full_name: fullName,
        phone: data.phone ?? null,
        email: data.email ?? null,
        status: data.status ?? 'active',
      });

      await auditService.log({ module: 'User', action: 'CREATE', userId: actorId, recordId: userId, ip });
      return userRepo.findById(conn, userId);
    });
  },

  async update(id, data, actorId, ip) {
    return withTransaction(async (conn) => {
      const user = await userRepo.findById(conn, id);
      if (!user) throw ApiError.notFound('User not found');

      const nextRole = data.role ?? user.role;
      const nextStatus = data.status ?? user.status;
      await assertNotLastSuperAdmin(conn, id, nextRole, nextStatus);
      if (data.status === 'inactive' && id === actorId) {
        throw ApiError.badRequest('You cannot deactivate your own account');
      }

      if (data.username) {
        const username = String(data.username).trim();
        if (await userRepo.usernameExists(conn, username, id)) {
          throw ApiError.conflict('Username is already taken');
        }
      }

      const isSelf = id === actorId;
      if (isSelf && data.username) {
        throw ApiError.badRequest('Change your own username from the profile menu');
      }
      if (isSelf && data.password) {
        throw ApiError.badRequest('Change your own password from the profile menu');
      }

      const roleId = data.role ? await resolveRoleId(conn, data.role) : null;
      await userRepo.update(conn, id, {
        role_id: roleId,
        username: isSelf ? null : data.username?.trim() ?? null,
        full_name: data.full_name?.trim() ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        status: data.status ?? null,
      });

      if (data.password) {
        const hash = await bcrypt.hash(String(data.password), 12);
        await userRepo.updatePassword(conn, id, hash);
        await refreshTokenRepo.revokeAllForUser(conn, id);
      }

      await auditService.log({ module: 'User', action: 'UPDATE', userId: actorId, recordId: id, ip });
      return userRepo.findById(conn, id);
    });
  },

  async deactivate(id, reason, actorId, ip) {
    return this.remove(id, reason, actorId, ip);
  },

  async remove(id, reason, actorId, ip) {
    const deleteReason = requireDeleteReason(reason);
    if (id === actorId) throw ApiError.badRequest('You cannot delete your own account');

    return withTransaction(async (conn) => {
      const user = await userRepo.findById(conn, id);
      if (!user) throw ApiError.notFound('User not found');
      await assertNotLastSuperAdmin(conn, id, ROLES.ADMIN, 'inactive');

      await userRepo.softDelete(conn, id, { reason: deleteReason, deletedBy: actorId });
      await trashRepo.add(conn, {
        entity_type: 'user',
        entity_id: id,
        entity_label: user.username || user.full_name || `User #${id}`,
        delete_reason: deleteReason,
        deleted_by: actorId,
      });

      await auditService.log({
        module: 'User',
        action: 'DELETE',
        userId: actorId,
        recordId: id,
        ip,
        details: deleteReason,
      });
      return { user_id: id, deleted: true };
    });
  },

  async updateProfile(userId, data, ip) {
    const user = await userRepo.findById(null, userId);
    if (!user) throw ApiError.notFound('User not found');
    await userRepo.updateProfile(null, userId, data);
    await auditService.log({ module: 'Auth', action: 'UPDATE_PROFILE', userId, recordId: userId, ip });
    return userRepo.findById(null, userId);
  },
};

export default userService;
