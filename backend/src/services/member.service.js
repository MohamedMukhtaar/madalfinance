import dayjs from 'dayjs';
import memberRepo from '../repositories/member.repo.js';
import trashRepo from '../repositories/trash.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
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
      const fullName = String(data.full_name || '').trim();
      if (!fullName) throw ApiError.badRequest('Full name is required');

      const memberId = await memberRepo.createMember(conn, {
        full_name: fullName,
        phone: data.phone ?? null,
        email: data.email ?? null,
        joined_date: data.joined_date || dayjs().format('YYYY-MM-DD'),
        default_monthly_due: data.default_monthly_due ?? 10,
        position: data.position ?? null,
        status: 'active',
      });

      await auditService.log({
        module: 'Member',
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
        full_name: data.full_name,
        phone: data.phone,
        email: data.email,
        position: data.position,
        default_monthly_due: data.default_monthly_due,
        status: data.status,
        joined_date: data.joined_date,
      });

      await auditService.log({
        module: 'Member',
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
    await auditService.log({ module: 'Member', action: 'UPLOAD_AVATAR', userId, recordId: id, ip });
    return memberRepo.findMemberById(null, id);
  },

  async deactivate(id, reason, userId, ip) {
    const deleteReason = requireDeleteReason(reason);
    return withTransaction(async (conn) => {
      const member = await memberRepo.findMemberById(conn, id);
      if (!member) throw ApiError.notFound('Member not found');

      await memberRepo.softDelete(conn, id, { reason: deleteReason, deletedBy: userId });
      await trashRepo.add(conn, {
        entity_type: 'member',
        entity_id: id,
        entity_label: member.member_name || `Member #${id}`,
        delete_reason: deleteReason,
        deleted_by: userId,
      });

      await auditService.log({
        module: 'Member',
        action: 'DELETE',
        userId,
        recordId: id,
        ip,
        details: deleteReason,
      });

      return { member_id: id };
    });
  },
};

export default memberService;
