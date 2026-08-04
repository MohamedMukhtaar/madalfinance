import projectRepo from '../repositories/project.repo.js';
import customerRepo from '../repositories/customer.repo.js';
import trashRepo from '../repositories/trash.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { requireDeleteReason } from '../helpers/deleteReason.js';

export const projectService = {
  async list(filters) {
    const rows = await projectRepo.list(null, filters);
    const total = await projectRepo.count(null, filters);
    return { rows, total };
  },

  async getById(id) {
    const project = await projectRepo.findById(null, id);
    if (!project) throw ApiError.notFound('Project not found');
    return project;
  },

  async create(data, userId, ip) {
    return withTransaction(async (conn) => {
      const customer = await customerRepo.findById(conn, data.customer_id);
      if (!customer) throw ApiError.notFound('Customer not found');

      const type = await projectRepo.typeByName(conn, data.project_type);
      if (!type) throw ApiError.badRequest(`Unknown project type '${data.project_type}'`);

      const id = await projectRepo.create(conn, {
        ...data,
        project_type_id: type.project_type_id,
        created_by: userId,
      });
      await auditService.log({ module: 'Project', action: 'CREATE', userId, recordId: id, ip });
      return projectRepo.findById(conn, id);
    });
  },

  async update(id, data, userId, ip) {
    return withTransaction(async (conn) => {
      const project = await projectRepo.findById(conn, id);
      if (!project) throw ApiError.notFound('Project not found');

      if (data.status && data.status === 'Completed') {
        await projectRepo.update(conn, id, { ...data, completed_date: data.completed_date ?? new Date() });
      } else {
        await projectRepo.update(conn, id, data);
      }
      await auditService.log({ module: 'Project', action: 'UPDATE', userId, recordId: id, ip });
      return projectRepo.findById(conn, id);
    });
  },

  async remove(id, reason, userId, ip) {
    const deleteReason = requireDeleteReason(reason);
    return withTransaction(async (conn) => {
      const project = await projectRepo.findById(conn, id);
      if (!project) throw ApiError.notFound('Project not found');
      await projectRepo.softDelete(conn, id, { reason: deleteReason, deletedBy: userId });
      await trashRepo.add(conn, {
        entity_type: 'project',
        entity_id: id,
        entity_label: project.project_name || `Project #${id}`,
        delete_reason: deleteReason,
        deleted_by: userId,
      });
      await auditService.log({ module: 'Project', action: 'DELETE', userId, recordId: id, ip });
      return { project_id: id };
    });
  },

  async types() {
    return projectRepo.listTypes(null);
  },
};

export default projectService;
