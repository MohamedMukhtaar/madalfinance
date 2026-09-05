import dayjs from 'dayjs';
import employeeRepo from '../repositories/employee.repo.js';
import hrLookupRepo from '../repositories/hrLookup.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';

const toId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const lookupName = async (conn, kind, id) => {
  if (!id) return null;
  const row = await hrLookupRepo.findById(conn, kind, id);
  if (!row) throw ApiError.badRequest(`Invalid ${kind.slice(0, -1)}`);
  const def = hrLookupRepo.getLookup(kind);
  return { id, name: row[def.nameCol] };
};

export const employeeService = {
  async list(filters) {
    const rows = await employeeRepo.list(null, filters);
    const total = await employeeRepo.count(null, filters);
    return { rows, total };
  },

  async getById(id) {
    const employee = await employeeRepo.findById(null, id);
    if (!employee) throw ApiError.notFound('Employee not found');
    return employee;
  },

  async create(data, userId, ip) {
    return withTransaction(async (conn) => {
      const firstName = String(data.first_name || '').trim();
      if (!firstName) throw ApiError.badRequest('First name is required');

      const title = await lookupName(conn, 'titles', toId(data.job_title_id));
      const dept = await lookupName(conn, 'departments', toId(data.department_id));
      const branch = await lookupName(conn, 'branches', toId(data.branch_id));
      const shift = await lookupName(conn, 'shifts', toId(data.shift_id));

      const id = await employeeRepo.create(conn, {
        first_name: firstName,
        last_name: data.last_name ? String(data.last_name).trim() : null,
        gender: data.gender ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        job_title: title?.name ?? (data.job_title ? String(data.job_title).trim() : null),
        department: dept?.name ?? (data.department ? String(data.department).trim() : null),
        job_title_id: title?.id ?? null,
        department_id: dept?.id ?? null,
        branch_id: branch?.id ?? null,
        shift_id: shift?.id ?? null,
        hire_date: data.hire_date || dayjs().format('YYYY-MM-DD'),
        basic_salary: Number(data.basic_salary ?? 0),
        notes: data.notes ?? null,
        created_by: userId,
      });

      await auditService.log({ module: 'Employee', action: 'CREATE', userId, recordId: id, ip });
      return employeeRepo.findById(conn, id);
    });
  },

  async update(id, data, userId, ip) {
    return withTransaction(async (conn) => {
      const employee = await employeeRepo.findById(conn, id);
      if (!employee) throw ApiError.notFound('Employee not found');

      const title = await lookupName(
        conn,
        'titles',
        data.job_title_id !== undefined ? toId(data.job_title_id) : employee.job_title_id
      );
      const dept = await lookupName(
        conn,
        'departments',
        data.department_id !== undefined ? toId(data.department_id) : employee.department_id
      );
      const branch = await lookupName(
        conn,
        'branches',
        data.branch_id !== undefined ? toId(data.branch_id) : employee.branch_id
      );
      const shift = await lookupName(
        conn,
        'shifts',
        data.shift_id !== undefined ? toId(data.shift_id) : employee.shift_id
      );

      await employeeRepo.update(conn, id, {
        first_name: data.first_name,
        last_name: data.last_name,
        gender: data.gender,
        phone: data.phone,
        email: data.email,
        address: data.address,
        job_title: title?.name ?? (data.job_title !== undefined ? data.job_title : employee.job_title),
        department: dept?.name ?? (data.department !== undefined ? data.department : employee.department),
        job_title_id: title?.id ?? null,
        department_id: dept?.id ?? null,
        branch_id: branch?.id ?? null,
        shift_id: shift?.id ?? null,
        hire_date: data.hire_date,
        basic_salary: data.basic_salary !== undefined ? Number(data.basic_salary) : null,
        status: data.status,
        notes: data.notes,
      });

      await auditService.log({ module: 'Employee', action: 'UPDATE', userId, recordId: id, ip });
      return employeeRepo.findById(conn, id);
    });
  },

  async remove(id, userId, ip) {
    return withTransaction(async (conn) => {
      const employee = await employeeRepo.findById(conn, id);
      if (!employee) throw ApiError.notFound('Employee not found');

      const charges = Number(await employeeRepo.countCharges(conn, id));
      if (charges > 0) {
        await employeeRepo.setStatus(conn, id, 'inactive');
        await auditService.log({ module: 'Employee', action: 'UPDATE', userId, recordId: id, ip });
        return { employee_id: id, deactivated: true };
      }

      await employeeRepo.remove(conn, id);
      await auditService.log({ module: 'Employee', action: 'DELETE', userId, recordId: id, ip });
      return { employee_id: id, deleted: true };
    });
  },
};

export default employeeService;
