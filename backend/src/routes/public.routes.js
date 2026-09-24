import { Router } from 'express';
import fs from 'node:fs';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { safeResolve } from '../helpers/fileHelper.js';

const router = Router();

/** Public member avatar images. */
router.get(
  '/avatars/:filename',
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw ApiError.badRequest('Invalid filename');
    }
    const abs = safeResolve('members', filename);
    if (!fs.existsSync(abs)) throw ApiError.notFound('Avatar not found');
    return res.sendFile(abs);
  })
);

/** User profile photos (filenames are random UUIDs). */
router.get(
  '/user-avatars/:filename',
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw ApiError.badRequest('Invalid filename');
    }
    const abs = safeResolve('users', filename);
    if (!fs.existsSync(abs)) throw ApiError.notFound('Avatar not found');
    return res.sendFile(abs);
  })
);

export default router;
