import templateRepo from '../repositories/projectTemplate.repo.js';
import projectRepo from '../repositories/project.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { deleteStoredFile } from '../helpers/fileHelper.js';

export const projectTemplateService = {
  async list(filters) {
    return templateRepo.list(null, filters);
  },

  async getById(id) {
    const row = await templateRepo.findById(null, id);
    if (!row) throw ApiError.notFound('Registered project not found');
    return row;
  },

  async create(data, userId, ip) {
    return withTransaction(async (conn) => {
      const type = await projectRepo.typeByName(conn, data.project_type);
      if (!type) throw ApiError.badRequest(`Unknown project type '${data.project_type}'`);

      const existing = await templateRepo.findByName(conn, data.template_name);
      if (existing) throw ApiError.conflict('A registered project with this name already exists');

      const isRental = data.project_type === 'Rental';
      const row = await templateRepo.create(conn, {
        template_name: data.template_name,
        project_type_id: type.project_type_id,
        description: data.description,
        project_price: isRental ? Number(data.monthly_amount ?? 0) : Number(data.project_price ?? 0),
        monthly_amount: isRental ? Number(data.monthly_amount ?? 0) : 0,
        setup_fee: isRental ? Number(data.setup_fee ?? 0) : 0,
        billing_day: isRental ? Number(data.billing_day ?? 1) : 1,
        status: data.status,
        created_by: userId,
      });
      await auditService.log({ module: 'ProjectTemplate', action: 'CREATE', userId, recordId: row.template_id, ip });
      return row;
    });
  },

  async update(id, data, userId, ip) {
    return withTransaction(async (conn) => {
      const row = await templateRepo.findById(conn, id);
      if (!row) throw ApiError.notFound('Registered project not found');

      if (data.template_name && data.template_name !== row.template_name) {
        const clash = await templateRepo.findByName(conn, data.template_name);
        if (clash) throw ApiError.conflict('A registered project with this name already exists');
      }

      const isRental = row.project_type === 'Rental';
      const patch = {
        template_name: data.template_name,
        description: data.description,
        status: data.status,
      };
      if (isRental) {
        if (data.monthly_amount != null) {
          patch.monthly_amount = Number(data.monthly_amount);
          patch.project_price = Number(data.monthly_amount);
        }
        if (data.setup_fee != null) patch.setup_fee = Number(data.setup_fee);
        if (data.billing_day != null) patch.billing_day = Number(data.billing_day);
      } else if (data.project_price != null) {
        patch.project_price = Number(data.project_price);
      }

      const updated = await templateRepo.update(conn, id, patch);
      await auditService.log({ module: 'ProjectTemplate', action: 'UPDATE', userId, recordId: id, ip });
      return updated;
    });
  },

  async remove(id, userId, ip) {
    return withTransaction(async (conn) => {
      const row = await templateRepo.findById(conn, id);
      if (!row) throw ApiError.notFound('Registered project not found');
      const used = await templateRepo.countAssignments(conn, id);
      if (used > 0) {
        throw ApiError.badRequest(`Cannot delete — ${used} customer project${used === 1 ? '' : 's'} still use this registration`);
      }
      if (row.logo_path) deleteStoredFile('projects', row.logo_path);
      await templateRepo.remove(conn, id);
      await auditService.log({ module: 'ProjectTemplate', action: 'DELETE', userId, recordId: id, ip });
      return { template_id: id };
    });
  },

  async uploadLogo(id, file, userId, ip) {
    const row = await templateRepo.findById(null, id);
    if (!row) throw ApiError.notFound('Registered project not found');
    if (row.project_type !== 'Rental') {
      throw ApiError.badRequest('Logo upload is only for rental projects');
    }
    if (row.logo_path) deleteStoredFile('projects', row.logo_path);
    await templateRepo.setLogo(null, id, {
      logo_path: file.filename,
      logo_file_name: file.originalname,
    });
    await auditService.log({ module: 'ProjectTemplate', action: 'UPLOAD_LOGO', userId, recordId: id, ip });
    return templateRepo.findById(null, id);
  },
};

export default projectTemplateService;
