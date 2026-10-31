import organizationRepo, { IMAGE_COLUMNS } from '../repositories/organization.repo.js';
import settingsRepo from '../repositories/settings.repo.js';
import auditService from './audit.service.js';
import { deleteStoredFile } from '../helpers/fileHelper.js';
import ApiError from '../utils/ApiError.js';

const emptyToNull = (v) => {
  if (v === undefined) return undefined;
  if (v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};

const HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const normalizeHex = (value, fallback) => {
  if (!value) return fallback;
  const v = String(value).trim();
  if (!HEX.test(v)) throw ApiError.badRequest(`Invalid color: ${value}`);
  return v.toUpperCase();
};

export const organizationService = {
  async get() {
    await organizationRepo.ensureRow(null);
    const org = await organizationRepo.get(null);
    if (!org) throw ApiError.notFound('Organization not initialized');
    return org;
  },

  async updateProfile(body, userId, ip) {
    await organizationRepo.ensureRow(null);
    const payload = {
      name: emptyToNull(body.name ?? body.company_name) ?? undefined,
      founded_date: emptyToNull(body.founded_date) ?? null,
      website_url: emptyToNull(body.website_url) ?? null,
      email: emptyToNull(body.email) ?? null,
      phone: emptyToNull(body.phone) ?? null,
      address: emptyToNull(body.address) ?? null,
      city: emptyToNull(body.city) ?? null,
      postal_code: emptyToNull(body.postal_code) ?? null,
      country: emptyToNull(body.country) ?? null,
      facebook_url: emptyToNull(body.facebook_url) ?? null,
      tiktok_url: emptyToNull(body.tiktok_url) ?? null,
      instagram_url: emptyToNull(body.instagram_url) ?? null,
    };
    if (!payload.name) throw ApiError.badRequest('Organization name is required');

    await organizationRepo.updateProfile(null, payload);
    await settingsRepo.update(null, {
      company_name: payload.name,
      company_phone: payload.phone,
      company_email: payload.email,
      company_address: payload.address,
    });
    await auditService.log({ module: 'Organization', action: 'UPDATE', userId, ip });
    return this.get();
  },

  async updateColors(body, userId, ip) {
    await organizationRepo.ensureRow(null);
    await organizationRepo.updateColors(null, {
      primary_color: normalizeHex(body.primary_color, null),
      secondary_color: normalizeHex(body.secondary_color, null),
      sidebar_bg: normalizeHex(body.sidebar_bg, null),
      sidebar_text: normalizeHex(body.sidebar_text, null),
      sidebar_active_bg: normalizeHex(body.sidebar_active_bg, null),
      sidebar_active_text: normalizeHex(body.sidebar_active_text, null),
    });
    await auditService.log({ module: 'Organization', action: 'UPDATE_COLORS', userId, ip });
    return this.get();
  },

  async uploadImage(kind, file, userId, ip) {
    if (!IMAGE_COLUMNS[kind]) throw ApiError.badRequest('Unknown image kind');
    if (!file) throw ApiError.badRequest('No image uploaded');
    await organizationRepo.ensureRow(null);
    const org = await this.get();
    const previous = org[IMAGE_COLUMNS[kind]];
    if (previous) deleteStoredFile('logos', previous);
    await organizationRepo.setImage(null, kind, file.filename);
    if (kind === 'light') {
      await settingsRepo.setLogo(null, file.filename);
    }
    await auditService.log({ module: 'Organization', action: 'UPLOAD_IMAGE', userId, ip, details: kind });
    return this.get();
  },

  async removeImage(kind, userId, ip) {
    if (!IMAGE_COLUMNS[kind]) throw ApiError.badRequest('Unknown image kind');
    const org = await this.get();
    const previous = org[IMAGE_COLUMNS[kind]];
    if (previous) deleteStoredFile('logos', previous);
    await organizationRepo.clearImage(null, kind);
    if (kind === 'light') {
      await settingsRepo.clearLogo(null);
    }
    await auditService.log({ module: 'Organization', action: 'REMOVE_IMAGE', userId, ip, details: kind });
    return this.get();
  },
};

export default organizationService;
