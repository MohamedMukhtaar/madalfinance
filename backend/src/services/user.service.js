import userRepo from '../repositories/user.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';

export const userService = {
  async list({ search, offset, perPage, order }) {
    const rows = await userRepo.list(null, { search, offset, perPage, order });
    const total = await userRepo.count(null, search);
    return { rows, total };
  },

  async updateProfile(userId, data, ip) {
    const user = await userRepo.findById(null, userId);
    if (!user) throw ApiError.notFound('User not found');
    await userRepo.updateProfile(null, userId, data);
    await auditService.log({ module: 'Auth', action: 'UPDATE_PROFILE', userId, recordId: userId, ip });
    return userRepo.findById(null, userId);
  },
};

export default userService;
