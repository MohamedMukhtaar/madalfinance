import auditRepo from '../repositories/audit.repo.js';

/**
 * Audit logging. Called from services so the audit entry is written
 * in the same transaction as the mutation where possible.
 */
export const auditService = {
  /**
   * Write an audit entry (best-effort, never throws).
   */
  async log({ module, action, userId = null, recordId = null, ip = null, device = null }) {
    try {
      await auditRepo.create(null, {
        user_id: userId,
        module,
        action,
        record_id: recordId,
        ip_address: ip,
        device,
      });
    } catch (err) {
      // Auditing must never break a financial operation.
    }
  },

  /** List audit logs with pagination + filters. */
  async list(filters) {
    const rows = await auditRepo.list(null, filters);
    const total = await auditRepo.count(null, filters);
    return { rows, total };
  },
};

export default auditService;
