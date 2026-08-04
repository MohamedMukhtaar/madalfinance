import contractRepo from '../repositories/contract.repo.js';
import customerRepo from '../repositories/customer.repo.js';
import trashRepo from '../repositories/trash.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { withTransaction } from '../config/db.js';
import { generateNumber } from '../helpers/numberGenerator.js';
import { deleteStoredFile, safeResolve } from '../helpers/fileHelper.js';
import { requireDeleteReason } from '../helpers/deleteReason.js';

export const contractService = {
  async list(filters) {
    const rows = await contractRepo.list(null, filters);
    const total = await contractRepo.count(null, filters);
    return { rows, total };
  },

  async getById(id) {
    const contract = await contractRepo.findById(null, id);
    if (!contract) throw ApiError.notFound('Contract not found');
    return contract;
  },

  async create(data, userId, ip) {
    return withTransaction(async (conn) => {
      const customer = await customerRepo.findById(conn, data.customer_id);
      if (!customer) throw ApiError.notFound('Customer not found');

      const contract_number = await generateNumber(conn, 'contracts', 'contract_number', data.prefix || 'CTR-');
      const id = await contractRepo.create(conn, { ...data, contract_number, created_by: userId });
      await auditService.log({ module: 'Contract', action: 'CREATE', userId, recordId: id, ip });
      return contractRepo.findById(conn, id);
    });
  },

  async update(id, data, userId, ip) {
    return withTransaction(async (conn) => {
      const contract = await contractRepo.findById(conn, id);
      if (!contract) throw ApiError.notFound('Contract not found');
      await contractRepo.update(conn, id, data);
      await auditService.log({ module: 'Contract', action: 'UPDATE', userId, recordId: id, ip });
      return contractRepo.findById(conn, id);
    });
  },

  async remove(id, reason, userId, ip) {
    const deleteReason = requireDeleteReason(reason);
    return withTransaction(async (conn) => {
      const contract = await contractRepo.findById(conn, id);
      if (!contract) throw ApiError.notFound('Contract not found');

      if (contract.signed_file_path) {
        deleteStoredFile('contracts', contract.signed_file_path);
      }
      await contractRepo.softDelete(conn, id, { reason: deleteReason, deletedBy: userId });
      await trashRepo.add(conn, {
        entity_type: 'contract',
        entity_id: id,
        entity_label: contract.contract_number || `Contract #${id}`,
        delete_reason: deleteReason,
        deleted_by: userId,
      });
      await auditService.log({ module: 'Contract', action: 'DELETE', userId, recordId: id, ip });
      return { contract_id: id };
    });
  },

  async saveSignedAgreement(id, file, userId, ip) {
    return withTransaction(async (conn) => {
      const contract = await contractRepo.findById(conn, id);
      if (!contract) throw ApiError.notFound('Contract not found');

      // Replace the previous signed file if any.
      if (contract.signed_file_path) {
        deleteStoredFile('contracts', contract.signed_file_path);
      }
      await contractRepo.saveSignedAgreement(conn, id, { file_name: file.originalname, file_path: file.filename });
      await auditService.log({ module: 'Contract', action: 'UPLOAD_SIGNED', userId, recordId: id, ip });
      return contractRepo.findById(conn, id);
    });
  },

  /** Absolute path + download name for a stored signed agreement, or null. */
  async downloadSigned(id) {
    const contract = await contractRepo.findById(null, id);
    if (!contract) throw ApiError.notFound('Contract not found');
    if (!contract.signed_file_path) throw ApiError.notFound('No signed agreement uploaded');
    return {
      path: safeResolve('contracts', contract.signed_file_path),
      name: contract.signed_file_name || contract.signed_file_path,
    };
  },
};

export default contractService;
