import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import memberRepo from '../repositories/member.repo.js';
import trashRepo from '../repositories/trash.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { ROLES } from '../utils/constants.js';
import { deleteStoredFile } from '../helpers/fileHelper.js';
import { requireDeleteReason } from '../helpers/deleteReason.js';

export const memberService = {
  async list({ search, status, offset, perPage, order }) {
    const rows = await memberRepo.listMembers(null, { search, status, offset, perPage, order });
    const total = await memberRepo.countMembers(null, { search, status });
    return { rows, total };
  },

  async getById(id) {
    const member = await memberRepo.findMemberById(null, id);
    if (!member) throw ApiError.notFound('Member not found');
    return member;
  },

  /** Public login-page team strip (no secrets). */
  async publicTeam() {
    const rows = await memberRepo.listPublicTeam(null);
    return rows.map((m) => ({
      member_id: m.member_id,
      member_name: m.member_name,
      position: m.position,
      avatar_url: m.avatar_path ? `/api/public/avatars/${encodeURIComponent(m.avatar_path)}` : null,
    }));
  },

  async create(data, userId, ip) {
    return withTransaction(async (conn) => {
      const username = String(data.username || '').trim();
      const fullName = String(data.full_name || '').trim();
      const password = String(data.password || '');

      if (!username || username.length < 3) throw ApiError.badRequest('Username is required');
      if (!fullName) throw ApiError.badRequest('Full name is required');
      if (!password || password.length < 8) {
        throw ApiError.badRequest('Password must be at least 8 characters');
      }
      if (await memberRepo.usernameExists(conn, username)) {
        throw ApiError.conflict('Username is already taken');
      }

      const roleId = await memberRepo.findRoleIdByName(conn, ROLES.MEMBER);
      if (!roleId) throw ApiError.internal('Member role is not configured');

      const hash = await bcrypt.hash(password, 12);
      const newUserId = await memberRepo.createUser(conn, {
        role_id: roleId,
        username,
        password: hash,
        full_name: fullName,
        phone: data.phone ?? null,
        email: data.email ?? null,
        status: 'active',
      });

      const memberId = await memberRepo.createMember(conn, {
        user_id: newUserId,
        joined_date: data.joined_date || dayjs().format('YYYY-MM-DD'),
        default_monthly_due: data.default_monthly_due ?? 10,
        position: data.position ?? null,
        status: 'active',
      });

      await auditService.log({
        module: 'User',
        action: 'CREATE',
        userId,
        recordId: memberId,
        ip,
      });

      return memberRepo.findMemberById(conn, memberId);
    });
  },

  async update(id, data, userId, ip) {
    return withTransaction(async (conn) => {
      const member = await memberRepo.findMemberById(conn, id);
      if (!member) throw ApiError.notFound('Member not found');

      await memberRepo.updateMember(conn, id, {
        position: data.position,
        default_monthly_due: data.default_monthly_due,
        status: data.status,
        joined_date: data.joined_date,
      });

      await memberRepo.updateUserById(conn, member.user_id, {
        full_name: data.full_name,
        phone: data.phone,
        email: data.email,
        status: data.status === 'inactive' ? 'inactive' : data.status === 'active' ? 'active' : undefined,
      });

      await auditService.log({
        module: 'User',
        action: 'UPDATE',
        userId,
        recordId: id,
        ip,
      });

      return memberRepo.findMemberById(conn, id);
    });
  },

  async uploadAvatar(id, file, userId, ip) {
    const member = await memberRepo.findMemberById(null, id);
    if (!member) throw ApiError.notFound('Member not found');
    if (member.avatar_path) {
      deleteStoredFile('members', member.avatar_path);
    }
    await memberRepo.saveAvatar(null, id, {
      avatar_path: file.filename,
      avatar_name: file.originalname,
    });
    await auditService.log({ module: 'User', action: 'UPLOAD_AVATAR', userId, recordId: id, ip });
    return memberRepo.findMemberById(null, id);
  },

  async deactivate(id, reason, userId, ip) {
    const deleteReason = requireDeleteReason(reason);
    return withTransaction(async (conn) => {
      const member = await memberRepo.findMemberById(conn, id);
      if (!member) throw ApiError.notFound('Member not found');

      await memberRepo.softDelete(conn, id, { reason: deleteReason, deletedBy: userId });
      await memberRepo.updateUserById(conn, member.user_id, { status: 'inactive' });
      await trashRepo.add(conn, {
        entity_type: 'member',
        entity_id: id,
        entity_label: member.member_name || member.username || `Member #${id}`,
        delete_reason: deleteReason,
        deleted_by: userId,
      });

      await auditService.log({
        module: 'User',
        action: 'DELETE',
        userId,
        recordId: id,
        ip,
      });

      return { member_id: id };
    });
  },
};

export default memberService;
