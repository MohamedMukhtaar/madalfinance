import ApiError from '../utils/ApiError.js';

/** Require a delete reason of at least 25 characters. */
export function requireDeleteReason(reason) {
  const text = String(reason ?? '').trim();
  if (text.length < 25) {
    throw ApiError.badRequest('Delete reason must be at least 25 characters');
  }
  return text;
}
