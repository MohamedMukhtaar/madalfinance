import run from './_base.js';

export const listActiveForUser = (conn, userId) =>
  run(
    conn,
    `SELECT * FROM user_devices WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at ASC`,
    [userId]
  );

export const findActiveByCredential = (conn, credentialId) =>
  run(conn, `SELECT * FROM user_devices WHERE credential_id = ? AND revoked_at IS NULL`, [credentialId]).then(
    (rows) => rows[0]
  );

export const create = (conn, { user_id, credential_id, public_key, sign_count, transports, device_name, user_agent }) =>
  run(
    conn,
    `INSERT INTO user_devices
       (user_id, credential_id, public_key, sign_count, transports, device_name, user_agent, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [user_id, credential_id, public_key, sign_count ?? 0, transports ?? null, device_name ?? null, user_agent ?? null]
  ).then((r) => r.insertId);

export const markUsed = (conn, deviceId, signCount) =>
  run(conn, `UPDATE user_devices SET sign_count = ?, last_used_at = NOW() WHERE device_id = ?`, [signCount, deviceId]);

export const revoke = (conn, userId, deviceId) =>
  run(
    conn,
    `UPDATE user_devices SET revoked_at = NOW() WHERE user_id = ? AND device_id = ? AND revoked_at IS NULL`,
    [userId, deviceId]
  ).then((r) => r.affectedRows);

export default { listActiveForUser, findActiveByCredential, create, markUsed, revoke };
