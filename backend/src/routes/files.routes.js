import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { APP_ACCESS } from '../utils/constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { safeResolve, uploadDirs } from '../helpers/fileHelper.js';
import ApiError from '../utils/ApiError.js';
import config from '../config/index.js';

const router = Router();

const ALLOWED_TYPES = new Set([...Object.keys(uploadDirs), 'reports']);

/**
 * Authenticated file download — replaces public static /uploads exposure.
 * GET /api/files/:type/:filename
 */
router.get(
  '/:type/:filename',
  authenticate,
  authorize(...APP_ACCESS),
  asyncHandler(async (req, res) => {
    const { type, filename } = req.params;
    if (!ALLOWED_TYPES.has(type)) throw ApiError.notFound('Unknown file type');
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw ApiError.badRequest('Invalid filename');
    }

    let abs;
    if (type === 'reports') {
      abs = path.resolve(config.dirs.reports, filename);
      if (!abs.startsWith(path.resolve(config.dirs.reports))) {
        throw ApiError.badRequest('Invalid file path');
      }
    } else {
      abs = safeResolve(type, filename);
    }

    if (!fs.existsSync(abs)) throw ApiError.notFound('File not found');
    const inline = String(req.query.inline ?? "").toLowerCase();
    if (inline === "1" || inline === "true" || inline === "yes") {
      // Allow browser inline rendering (useful for PDF preview in an iframe).
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      return res.sendFile(abs);
    }

    return res.download(abs, filename);
  })
);

export default router;
