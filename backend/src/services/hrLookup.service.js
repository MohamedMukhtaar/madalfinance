import hrLookupRepo from '../repositories/hrLookup.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';

const requireKind = (kind) => {
  const def = hrLookupRepo.getLookup(kind);
  if (!def) throw ApiError.badRequest('Unknown organization type');
  return def;
};

const emptyToNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return value;
};

export const hrLookupService = {
  async list(kind) {
    requireKind(kind);
    return hrLookupRepo.list(null, kind);
  },

  async getById(kind, id) {
    requireKind(kind);
    const row = await hrLookupRepo.findById(null, kind, id);
    if (!row) throw ApiError.notFound('Record not found');
    return row;
  },

  async create(kind, data, userId, ip) {
    requireKind(kind);
    const name = String(data.name || '').trim();
    if (!name) throw ApiError.badRequest('Name is required');

    return withTransaction(async (conn) => {
      const existing = await hrLookupRepo.findByName(conn, kind, name);
      if (existing) throw ApiError.conflict('A record with this name already exists');

      const id = await hrLookupRepo.create(conn, kind, {
        name,
        notes: emptyToNull(data.notes),
        start_time: emptyToNull(data.start_time),
        end_time: emptyToNull(data.end_time),
        status: data.status || 'active',
      });
      await auditService.log({ module: 'Employee', action: 'CREATE', userId, recordId: id, ip, details: kind });
      return hrLookupRepo.findById(conn, kind, id);
    });
  },

  async update(kind, id, data, userId, ip) {
    const def = requireKind(kind);
    return withTransaction(async (conn) => {
      const row = await hrLookupRepo.findById(conn, kind, id);
      if (!row) throw ApiError.notFound('Record not found');

      const name = data.name !== undefined ? String(data.name).trim() : null;
      if (name === '') throw ApiError.badRequest('Name is required');
      if (name) {
        const existing = await hrLookupRepo.findByName(conn, kind, name);
        if (existing && Number(existing[def.idCol]) !== Number(id)) {
          throw ApiError.conflict('A record with this name already exists');
        }
      }

      await hrLookupRepo.update(conn, kind, id, {
        name,
        notes: data.notes !== undefined ? emptyToNull(data.notes) : undefined,
        start_time: data.start_time !== undefined ? emptyToNull(data.start_time) : undefined,
        end_time: data.end_time !== undefined ? emptyToNull(data.end_time) : undefined,
        status: data.status,
      });
      if (name) await hrLookupRepo.syncEmployeeName(conn, kind, id, name);
      await auditService.log({ module: 'Employee', action: 'UPDATE', userId, recordId: id, ip, details: kind });
      return hrLookupRepo.findById(conn, kind, id);
    });
  },

  async remove(kind, id, userId, ip) {
    requireKind(kind);
    return withTransaction(async (conn) => {
      const row = await hrLookupRepo.findById(conn, kind, id);
      if (!row) throw ApiError.notFound('Record not found');
      const used = Number(await hrLookupRepo.countEmployees(conn, kind, id));
      if (used > 0) {
        throw ApiError.badRequest('Cannot delete a record that is assigned to employees');
      }
      await hrLookupRepo.remove(conn, kind, id);
      await auditService.log({ module: 'Employee', action: 'DELETE', userId, recordId: id, ip, details: kind });
      return { deleted: true };
    });
  },
};

export default hrLookupService;
