import projectRepo from '../repositories/project.repo.js';
import customerRepo from '../repositories/customer.repo.js';
import trashRepo from '../repositories/trash.repo.js';
import rentalService from './rental.service.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { requireDeleteReason } from '../helpers/deleteReason.js';
import { deleteStoredFile } from '../helpers/fileHelper.js';

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

      const isRental = data.project_type === 'Rental';
      const projectPrice = isRental
        ? Number(data.monthly_amount)
        : Number(data.project_price);

      const id = await projectRepo.create(conn, {
        customer_id: data.customer_id,
        project_type_id: type.project_type_id,
        project_name: data.project_name,
        description: data.description,
        project_price: projectPrice,
        start_date: data.start_date || null,
        expected_finish: data.expected_finish || null,
        status: data.status,
        created_by: userId,
      });
      await auditService.log({ module: 'Project', action: 'CREATE', userId, recordId: id, ip });

      if (isRental) {
        await rentalService.create(
          {
            project_id: id,
            monthly_amount: Number(data.monthly_amount),
            setup_fee: Number(data.setup_fee ?? 0),
            billing_day: Number(data.billing_day ?? 1),
          },
          userId,
          ip,
          conn
        );
      }

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
      await auditService.log({ module: 'Project', action: 'DELETE', userId, recordId: id, ip, details: deleteReason });
      return { project_id: id };
    });
  },

  async types() {
    return projectRepo.listTypes(null);
  },

  async uploadLogo(id, file, userId, ip) {
    const project = await projectRepo.findById(null, id);
    if (!project) throw ApiError.notFound('Project not found');
    if (project.project_type !== 'Rental') {
      throw ApiError.badRequest('Logo upload is only for rental projects');
    }
    if (project.logo_path) deleteStoredFile('projects', project.logo_path);
    await projectRepo.setLogo(null, id, {
      logo_path: file.filename,
      logo_file_name: file.originalname,
    });
    await auditService.log({ module: 'Project', action: 'UPLOAD_LOGO', userId, recordId: id, ip });
    return projectRepo.findById(null, id);
  },

  async uploadAttachment(id, file, userId, ip) {
    const project = await projectRepo.findById(null, id);
    if (!project) throw ApiError.notFound('Project not found');
    if (project.attachment_path) {
      throw ApiError.conflict('This project already has an attachment');
    }
    await projectRepo.setAttachment(null, id, {
      attachment_path: file.filename,
      attachment_file_name: file.originalname,
    });
    await auditService.log({ module: 'Project', action: 'UPLOAD_ATTACHMENT', userId, recordId: id, ip });
    return projectRepo.findById(null, id);
  },
};

export default projectService;
