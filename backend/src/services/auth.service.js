import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import config from '../config/index.js';
import userRepo from '../repositories/user.repo.js';
import refreshTokenRepo from '../repositories/refreshToken.repo.js';
import auditService from './audit.service.js';
import ApiError from '../utils/ApiError.js';
import { signAccessToken, generateRefreshToken, hashRefreshToken } from '../utils/jwt.js';

const { jwt } = config;

const issueTokens = async (user, ip, device) => {
  const accessToken = signAccessToken({ id: user.user_id, username: user.username, role: user.role });
  const refreshToken = generateRefreshToken();
  const expiresAt = dayjs().add(jwt.refreshExpiresDays, 'day').toDate();
  await refreshTokenRepo.create(null, {
    user_id: user.user_id,
    token_hash: hashRefreshToken(refreshToken),
    expires_at: expiresAt,
    ip_address: ip,
    device,
  });
  return { accessToken, refreshToken, expiresAt };
};

export const authService = {
  async login(username, password, ip, device) {
    const user = await userRepo.findByUsername(null, username);
    if (!user || user.status !== 'active') throw ApiError.unauthorized('Invalid username or password');

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) throw ApiError.unauthorized('Invalid username or password');

    await userRepo.touchLastLogin(null, user.user_id);

    const { accessToken, refreshToken, expiresAt } = await issueTokens(user, ip, device);
    await auditService.log({
      module: 'Auth',
      action: 'LOGIN',
      userId: user.user_id,
      recordId: user.user_id,
      ip,
      device,
    });

    const { password: _pw, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken, expiresAt };
  },

  async refresh(refreshToken, ip, device) {
    if (!refreshToken) throw ApiError.unauthorized('Refresh token is required');

    const stored = await refreshTokenRepo.findValid(null, hashRefreshToken(refreshToken));
    if (!stored) throw ApiError.unauthorized('Invalid or expired refresh token');
    if (stored.status !== 'active') throw ApiError.unauthorized('Your account is disabled');

    // Rotate: revoke the used token, issue a new pair.
    await refreshTokenRepo.revoke(null, stored.token_id);
    const { accessToken, refreshToken: newRefresh, expiresAt } = await issueTokens(stored, ip, device);

    await auditService.log({
      module: 'Auth',
      action: 'REFRESH',
      userId: stored.user_id,
      recordId: stored.user_id,
      ip,
      device,
    });

    return {
      user: { user_id: stored.user_id, username: stored.username, full_name: stored.full_name, role: stored.role },
      accessToken,
      refreshToken: newRefresh,
      expiresAt,
    };
  },

  async logout(refreshToken, userId) {
    if (!refreshToken) return;
    const stored = await refreshTokenRepo.findValid(null, hashRefreshToken(refreshToken));
    if (stored) await refreshTokenRepo.revoke(null, stored.token_id);
    await auditService.log({ module: 'Auth', action: 'LOGOUT', userId });
  },

  async changePassword(userId, currentPassword, newPassword, ip) {
    const user = await userRepo.findByIdWithPassword(null, userId);
    if (!user) throw ApiError.notFound('User not found');

    const passwordOk = await bcrypt.compare(currentPassword, user.password);
    if (!passwordOk) throw ApiError.unauthorized('Current password is incorrect');

    const hashed = await bcrypt.hash(newPassword, 12);
    await userRepo.updatePassword(null, userId, hashed);
    await refreshTokenRepo.revokeAllForUser(null, userId);

    await auditService.log({ module: 'Auth', action: 'CHANGE_PASSWORD', userId, recordId: userId, ip });
  },

  async changeUsername(userId, currentPassword, newUsername, ip) {
    const user = await userRepo.findByIdWithPassword(null, userId);
    if (!user) throw ApiError.notFound('User not found');

    const passwordOk = await bcrypt.compare(currentPassword, user.password);
    if (!passwordOk) throw ApiError.unauthorized('Current password is incorrect');

    const existing = await userRepo.usernameExists(null, newUsername, userId);
    if (existing) throw ApiError.conflict('Username already taken');

    await userRepo.updateUsername(null, userId, newUsername);
    await auditService.log({ module: 'Auth', action: 'CHANGE_USERNAME', userId, recordId: userId, ip });
  },

  async getProfile(userId) {
    const user = await userRepo.findById(null, userId);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },
};

export default authService;
