import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import env from '../config/index.js';
import ApiError from '../utils/ApiError.js';
import { CONTRACT_SIGNED_MIMES, RECEIPT_MIMES } from '../utils/constants.js';

export const uploadDirs = Object.freeze({
  contracts: path.join(env.dirs.uploads, 'contracts'),
  payments: path.join(env.dirs.uploads, 'payments'),
  expenses: path.join(env.dirs.uploads, 'expenses'),
  invoices: path.join(env.dirs.uploads, 'invoices'),
  logos: path.join(env.dirs.uploads, 'logos'),
  contributions: path.join(env.dirs.uploads, 'contributions'),
  members: path.join(env.dirs.uploads, 'members'),
});

const MIME_MAP = Object.freeze({
  contracts: CONTRACT_SIGNED_MIMES,
  payments: RECEIPT_MIMES,
  expenses: RECEIPT_MIMES,
  invoices: RECEIPT_MIMES,
  logos: ['image/jpeg', 'image/png', 'image/webp'],
  contributions: RECEIPT_MIMES,
  members: ['image/jpeg', 'image/png', 'image/webp'],
});

const extensionFor = (mime) =>
  ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' })[mime] || '.bin';

function ensureUploadDirs() {
  for (const dir of Object.values(uploadDirs)) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Multer disk storage keyed by upload *type* (folder), while accepting form field "file"
 * from the frontend.
 */
export const createUploader = (type, allowedMimes, maxCount = 1) =>
  multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        ensureUploadDirs();
        cb(null, uploadDirs[type] || env.dirs.uploads);
      },
      filename: (_req, file, cb) => {
        const ext = extensionFor(file.mimetype);
        cb(null, `${crypto.randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: env.uploads.maxFileSizeMb * 1024 * 1024, files: Math.max(1, maxCount) },
    fileFilter: (_req, file, cb) => {
      const allowed = MIME_MAP[type] || allowedMimes || RECEIPT_MIMES;
      if (!allowed.includes(file.mimetype)) {
        return cb(
          ApiError.badRequest(`File type not allowed for "${type}". Allowed: ${allowed.join(', ')}`)
        );
      }
      const originalExt = path.extname(file.originalname || '').toLowerCase();
      const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp']);
      if (originalExt && !ALLOWED_EXTENSIONS.has(originalExt)) {
        return cb(ApiError.badRequest(`File extension not allowed: ${originalExt}`));
      }
      cb(null, true);
    },
  });

export const singleUpload = (type, allowedMimes) =>
  createUploader(type, allowedMimes, 1).single('file');

export const multiUpload = (type, maxCount = 5) =>
  createUploader(type, null, maxCount).array('file', maxCount);

/** Resolve a stored relative path into an absolute path, rejecting traversal. */
export const safeResolve = (type, filename) => {
  const base = uploadDirs[type];
  if (!base) throw ApiError.notFound('Unknown upload type');
  const abs = path.resolve(base, filename);
  if (!abs.startsWith(path.resolve(base))) {
    throw ApiError.badRequest('Invalid file path');
  }
  return abs;
};

/** Delete a stored file safely. */
export const deleteStoredFile = (type, filename) => {
  if (!filename) return;
  try {
    const abs = safeResolve(type, filename);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {
    /* best-effort cleanup */
  }
};

export const fileExists = (type, filename) => {
  try {
    return fs.existsSync(safeResolve(type, filename));
  } catch {
    return false;
  }
};
