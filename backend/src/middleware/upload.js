import multer from 'multer';
import ApiError from '../utils/ApiError.js';
import { singleUpload, multiUpload } from '../helpers/fileHelper.js';

/** Generic Multer error -> standardized ApiError. */
export const multerErrorHandler = (err, _req, _res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large'
        : `Upload error: ${err.code}`;
    return next(ApiError.badRequest(message));
  }
  return next(err);
};

export { singleUpload, multiUpload };
