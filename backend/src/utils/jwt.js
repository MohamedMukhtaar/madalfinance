import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import env from '../config/index.js';
import ApiError from './ApiError.js';

/** Sign a short-lived JWT access token. */
export const signAccessToken = (user) =>
  jwt.sign(
    {
      username: user.username,
      role: user.role,
    },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn, subject: String(user.id) }
  );

export const verifyAccess = (token) => {
  try {
    return jwt.verify(token, env.jwt.accessSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token');
  }
};

/** Generate a cryptographically-random opaque refresh token. */
export const generateRefreshToken = () => crypto.randomBytes(48).toString('base64url');

/** SHA-256 hash of a refresh token, stored instead of the raw token. */
export const hashRefreshToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export default { signAccessToken, verifyAccess, generateRefreshToken, hashRefreshToken };
