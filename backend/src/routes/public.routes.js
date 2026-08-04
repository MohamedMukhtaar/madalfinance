import { Router } from 'express';
import fs from 'node:fs';
import memberService from '../services/member.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { safeResolve } from '../helpers/fileHelper.js';

const router = Router();

/** Active co-founders for the login "Trusted by" strip. */
router.get(
  '/team',
  asyncHandler(async (_req, res) => {
    const team = await memberService.publicTeam();
    return ApiResponse.success(res, team, 'Team fetched');
  })
);

/** Public member avatar images (login page). */
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

export default router;
