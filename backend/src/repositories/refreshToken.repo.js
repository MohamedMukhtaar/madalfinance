import run from './_base.js';

export const create = (conn, { user_id, token_hash, expires_at, ip_address, device }) =>
  run(
    conn,
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, device)
     VALUES (?, ?, ?, ?, ?)`,
    [user_id, token_hash, expires_at, ip_address ?? null, device ?? null]
  ).then((r) => r.insertId);

/** Returns the token row joined with the user, or undefined if missing/revoked/expired. */
export const findValid = (conn, tokenHash) =>
  run(
    conn,
    `SELECT t.*, u.user_id, u.username, u.full_name, u.status, r.role_name AS role
       FROM refresh_tokens t JOIN users u ON u.user_id = t.user_id
       JOIN roles r ON r.role_id = u.role_id
      WHERE t.token_hash = ? AND t.is_revoked = FALSE AND t.expires_at > NOW()`,
    [tokenHash]
  ).then((rows) => rows[0]);

export const revoke = (conn, tokenId) =>
  run(conn, `UPDATE refresh_tokens SET is_revoked = TRUE, revoked_at = NOW() WHERE token_id = ?`, [tokenId]);

export const revokeAllForUser = (conn, userId) =>
  run(conn, `UPDATE refresh_tokens SET is_revoked = TRUE, revoked_at = NOW() WHERE user_id = ?`, [userId]);

export const cleanupExpired = (conn) =>
  run(conn, `DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '7 days'`);

export default { create, findValid, revoke, revokeAllForUser, cleanupExpired };
