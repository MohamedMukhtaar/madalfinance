import settingsRepo from '../repositories/settings.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';

export const settingsService = {
  async get() {
    const settings = await settingsRepo.get(null);
    if (!settings) throw ApiError.notFound('Settings not initialized');
    return settings;
  },

  async update(data, userId, ip) {
    await this.get();
    await settingsRepo.update(null, data);
    await auditService.log({ module: 'Setting', action: 'UPDATE', userId, ip });
    return settingsRepo.get(null);
  },
};

export default settingsService;
