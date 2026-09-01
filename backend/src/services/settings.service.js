import settingsRepo from '../repositories/settings.repo.js';
import auditService from './audit.service.js';
import { deleteStoredFile } from '../helpers/fileHelper.js';
import ApiError from '../utils/ApiError.js';

export const settingsService = {
  async get() {
    const settings = await settingsRepo.get(null);
    if (!settings) throw ApiError.notFound('Settings not initialized');
    return settings;
  },

  normalizeUpdate(data = {}) {
    const str = (v) => (typeof v === 'string' && v.trim() === '' ? null : v ?? null);
    return {
      company_name: data.company_name ?? data.companyName ?? null,
      company_phone: str(data.company_phone ?? data.companyPhone),
      company_email: str(data.company_email ?? data.companyEmail),
      company_address: str(data.company_address ?? data.companyAddress),
      currency: data.currency ?? null,
      default_member_due: data.default_member_due ?? data.defaultMemberDue ?? null,
      invoice_prefix: data.invoice_prefix ?? data.invoicePrefix ?? null,
      payment_prefix: data.payment_prefix ?? data.paymentPrefix ?? null,
      contract_prefix: data.contract_prefix ?? data.contractPrefix ?? null,
      timezone: data.timezone ?? null,
    };
  },

  async update(data, userId, ip) {
    await this.get();
    await settingsRepo.update(null, this.normalizeUpdate(data));
    await auditService.log({ module: 'Setting', action: 'UPDATE', userId, ip });
    return settingsRepo.get(null);
  },

  async uploadLogo(file, userId, ip) {
    const settings = await this.get();
    if (settings.logo) deleteStoredFile('logos', settings.logo);
    await settingsRepo.setLogo(null, file.filename);
    await auditService.log({ module: 'Setting', action: 'UPLOAD_LOGO', userId, ip });
    return settingsRepo.get(null);
  },

  async removeLogo(userId, ip) {
    const settings = await this.get();
    if (settings.logo) deleteStoredFile('logos', settings.logo);
    await settingsRepo.clearLogo(null);
    await auditService.log({ module: 'Setting', action: 'REMOVE_LOGO', userId, ip });
    return settingsRepo.get(null);
  },
};

export default settingsService;
