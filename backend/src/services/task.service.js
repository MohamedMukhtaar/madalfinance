import taskRepo from '../repositories/task.repo.js';
import employeeRepo from '../repositories/employee.repo.js';
import memberRepo from '../repositories/member.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';

const normalizeAssignee = async (conn, data) => {
  const type = String(data.assignee_type || '').toLowerCase();
  if (type !== 'employee' && type !== 'member') {
    throw ApiError.badRequest('Assign the task to an employee or a member');
  }

  if (type === 'employee') {
    const employeeId = Number(data.employee_id);
    if (!employeeId) throw ApiError.badRequest('Select an employee');
    const emp = await employeeRepo.findById(conn, employeeId);
    if (!emp || emp.status === 'inactive') throw ApiError.badRequest('Employee not found or inactive');
    return { assignee_type: 'employee', employee_id: employeeId, member_id: null };
  }

  const memberId = Number(data.member_id);
  if (!memberId) throw ApiError.badRequest('Select a member');
  const member = await memberRepo.findMemberById(conn, memberId);
  if (!member || member.status === 'inactive') throw ApiError.badRequest('Member not found or inactive');
  return { assignee_type: 'member', member_id: memberId, employee_id: null };
};

export const taskService = {
  async list(filters) {
    const rows = await taskRepo.list(null, filters);
    const total = await taskRepo.count(null, filters);
    return { rows, total };
  },

  async stats() {
    return taskRepo.stats(null);
  },

  async getById(id) {
    const task = await taskRepo.findById(null, id);
    if (!task) throw ApiError.notFound('Task not found');
    return task;
  },

  async create(data, userId, ip) {
    return withTransaction(async (conn) => {
      const title = String(data.title || '').trim();
      if (!title) throw ApiError.badRequest('Title is required');

      const type = String(data.assignee_type || '').toLowerCase();
      const rawIds =
        type === 'employee'
          ? data.employee_ids ?? (data.employee_id != null ? [data.employee_id] : [])
          : data.member_ids ?? (data.member_id != null ? [data.member_id] : []);
      const ids = [...new Set((Array.isArray(rawIds) ? rawIds : []).map(Number).filter((n) => n > 0))];
      if (!ids.length) {
        throw ApiError.badRequest(type === 'employee' ? 'Select at least one employee' : 'Select at least one member');
      }

      const status = data.status || 'Todo';
      const priority = data.priority || 'Medium';
      const description = data.description ? String(data.description).trim() : null;
      const dueDate = data.due_date || null;
      const created = [];

      for (const id of ids) {
        const assignee = await normalizeAssignee(conn, {
          assignee_type: type,
          employee_id: type === 'employee' ? id : null,
          member_id: type === 'member' ? id : null,
        });
        const taskId = await taskRepo.create(conn, {
          title,
          description,
          priority,
          status,
          due_date: dueDate,
          ...assignee,
          created_by: userId,
          notes: null,
        });
        await auditService.log({ module: 'Task', action: 'CREATE', userId, recordId: taskId, ip });
        created.push(await taskRepo.findById(conn, taskId));
      }

      return created.length === 1 ? created[0] : created;
    });
  },

  async update(id, data, userId, ip) {
    return withTransaction(async (conn) => {
      const existing = await taskRepo.findById(conn, id);
      if (!existing) throw ApiError.notFound('Task not found');

      let assignee = {};
      if (data.assignee_type || data.employee_id !== undefined || data.member_id !== undefined) {
        assignee = await normalizeAssignee(conn, {
          assignee_type: data.assignee_type || existing.assignee_type,
          employee_id: data.employee_id !== undefined ? data.employee_id : existing.employee_id,
          member_id: data.member_id !== undefined ? data.member_id : existing.member_id,
        });
      }

      const patch = {
        title: data.title !== undefined ? String(data.title).trim() : undefined,
        description: data.description !== undefined ? String(data.description || '').trim() || null : undefined,
        priority: data.priority,
        status: data.status,
        due_date: data.due_date !== undefined ? data.due_date || null : undefined,
        notes: data.notes !== undefined ? String(data.notes || '').trim() || null : undefined,
        ...assignee,
      };

      if (patch.title !== undefined && !patch.title) throw ApiError.badRequest('Title is required');

      await taskRepo.update(conn, id, patch);
      await auditService.log({ module: 'Task', action: 'UPDATE', userId, recordId: id, ip });
      return taskRepo.findById(conn, id);
    });
  },

  async remove(id, userId, ip) {
    return withTransaction(async (conn) => {
      const existing = await taskRepo.findById(conn, id);
      if (!existing) throw ApiError.notFound('Task not found');
      await taskRepo.softDelete(conn, id);
      await auditService.log({ module: 'Task', action: 'DELETE', userId, recordId: id, ip });
      return { task_id: id, deleted: true };
    });
  },
};

export default taskService;
