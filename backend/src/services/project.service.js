import projectRepo from '../repositories/project.repo.js';
import templateRepo from '../repositories/projectTemplate.repo.js';
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

      let type;
      let isRental;
      let projectName;
      let description;
      let projectPrice;
      let monthlyAmount;
      let setupFee;
      let billingDay;
      let discount = Math.max(0, Number(data.discount ?? 0));
      let templateId = data.template_id ? Number(data.template_id) : null;
      let logoCopy = null;

      if (templateId) {
        const tpl = await templateRepo.findById(conn, templateId);
        if (!tpl) throw ApiError.notFound('Registered project not found');
        if (String(tpl.status).toLowerCase() !== 'active') {
          throw ApiError.badRequest('This registered project is inactive');
        }
        type = { project_type_id: tpl.project_type_id };
        isRental = tpl.project_type === 'Rental';
        projectName = tpl.template_name;
        description = data.description || tpl.description;
        monthlyAmount = Number(tpl.monthly_amount);
        setupFee = Number(tpl.setup_fee ?? 0);
        billingDay = Number(data.billing_day ?? tpl.billing_day ?? 1);
        const listPrice = isRental ? monthlyAmount : Number(tpl.project_price);
        if (discount > listPrice) {
          throw ApiError.badRequest('Discount cannot be greater than the project price');
        }
        projectPrice = round2(listPrice - discount);
        if (isRental) {
          if (projectPrice < 0.01) {
            throw ApiError.badRequest('Discount cannot zero out monthly rent');
          }
          monthlyAmount = projectPrice;
        }
        if (tpl.logo_path) {
          logoCopy = { logo_path: tpl.logo_path, logo_file_name: tpl.logo_file_name };
        }
        if (isRental) {
          const dup = await projectRepo.findByCustomerAndTemplate(conn, data.customer_id, templateId);
          if (dup) throw ApiError.conflict(`${projectName} is already assigned to this customer`);
        }
      } else {
        type = await projectRepo.typeByName(conn, data.project_type);
        if (!type) throw ApiError.badRequest(`Unknown project type '${data.project_type}'`);
        isRental = data.project_type === 'Rental';
        projectName = data.project_name;
        description = data.description;
        monthlyAmount = Number(data.monthly_amount);
        setupFee = Number(data.setup_fee ?? 0);
        billingDay = Number(data.billing_day ?? 1);
        projectPrice = isRental ? monthlyAmount : Number(data.project_price);
      }

      const id = await projectRepo.create(conn, {
        customer_id: data.customer_id,
        template_id: templateId,
        project_type_id: type.project_type_id,
        project_name: projectName,
        description,
        project_price: projectPrice,
        discount,
        start_date: data.start_date || null,
        expected_finish: data.expected_finish || null,
        status: data.status,
        created_by: userId,
      });
      if (logoCopy) await projectRepo.setLogo(conn, id, logoCopy);
      await auditService.log({ module: 'Project', action: 'CREATE', userId, recordId: id, ip });

      if (isRental) {
        await rentalService.create(
          {
            project_id: id,
            monthly_amount: monthlyAmount,
            setup_fee: setupFee,
            billing_day: billingDay,
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

const round2 = (n) => Math.round(Number(n) * 100) / 100;

export default projectService;
