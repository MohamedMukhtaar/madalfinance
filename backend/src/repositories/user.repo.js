import run from './_base.js';

const publicCols = `
  u.user_id, u.username, u.full_name, u.phone, u.email, u.status,
  u.last_login, u.created_at, u.updated_at, r.role_name AS role
`;

export const findByUsername = (conn, username) =>
  run(
    conn,
    `SELECT u.user_id, u.username, u.password_hash AS password, u.full_name, u.phone, u.email, u.status,
            r.role_name AS role
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
      WHERE u.username = ? AND u.status = 'active' AND u.deleted_at IS NULL`,
    [username]
  ).then((rows) => rows[0]);

export const findByIdWithPassword = (conn, id) =>
  run(
    conn,
    `SELECT u.user_id, u.username, u.password_hash AS password, u.full_name, u.phone, u.email, u.status,
            r.role_name AS role
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
      WHERE u.user_id = ? AND u.deleted_at IS NULL`,
    [id]
  ).then((rows) => rows[0]);

export const findById = (conn, id) =>
  run(
    conn,
    `SELECT ${publicCols} FROM users u JOIN roles r ON r.role_id = u.role_id
      WHERE u.user_id = ? AND u.deleted_at IS NULL`,
    [id]
  ).then((rows) => rows[0]);

export const findByIdIncludingDeleted = (conn, id) =>
  run(
    conn,
    `SELECT ${publicCols} FROM users u JOIN roles r ON r.role_id = u.role_id WHERE u.user_id = ?`,
    [id]
  ).then((rows) => rows[0]);

export const list = (conn, { search, offset, perPage, order }) => {
  const conditions = ['u.deleted_at IS NULL'];
  const params = [];
  if (search) {
    conditions.push('(u.username ILIKE ? OR u.full_name ILIKE ? OR u.email ILIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return run(
    conn,
    `SELECT ${publicCols}
       FROM users u JOIN roles r ON r.role_id = u.role_id
       ${where}
      ORDER BY ${order}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, search) => {
  const conditions = ['deleted_at IS NULL'];
  const params = [];
  if (search) {
    conditions.push('(username ILIKE ? OR full_name ILIKE ? OR email ILIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return run(conn, `SELECT COUNT(*) AS total FROM users u ${where}`, params).then((r) => r[0].total);
};

export const updateUsername = (conn, id, username) =>
  run(conn, `UPDATE users SET username = ? WHERE user_id = ?`, [username, id]);

export const updatePassword = (conn, id, hash) =>
  run(conn, `UPDATE users SET password_hash = ? WHERE user_id = ?`, [hash, id]);

export const updateProfile = (conn, id, { full_name, phone, email }) =>
  run(
    conn,
    `UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), email = COALESCE(?, email) WHERE user_id = ?`,
    [full_name ?? null, phone ?? null, email ?? null, id]
  );

export const touchLastLogin = (conn, id) =>
  run(conn, `UPDATE users SET last_login = NOW() WHERE user_id = ?`, [id]);

export const usernameExists = (conn, username, excludeUserId = null) => {
  const params = [username];
  let sql = `SELECT user_id FROM users WHERE username = ?`;
  if (excludeUserId) {
    sql += ` AND user_id != ?`;
    params.push(excludeUserId);
  }
  return run(conn, sql, params).then((rows) => rows.length > 0);
};

export const create = (conn, data) =>
  run(
    conn,
    `INSERT INTO users (role_id, username, password_hash, full_name, phone, email, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.role_id,
      data.username,
      data.password,
      data.full_name,
      data.phone ?? null,
      data.email ?? null,
      data.status ?? 'active',
    ]
  ).then((r) => r.insertId);

export const update = (conn, id, data) =>
  run(
    conn,
    `UPDATE users SET
        role_id = COALESCE(?, role_id),
        username = COALESCE(?, username),
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        status = COALESCE(?, status)
      WHERE user_id = ?`,
    [
      data.role_id ?? null,
      data.username ?? null,
      data.full_name ?? null,
      data.phone ?? null,
      data.email ?? null,
      data.status ?? null,
      id,
    ]
  );

export const setStatus = (conn, id, status) =>
  run(conn, `UPDATE users SET status = ? WHERE user_id = ?`, [status, id]);

export const countActiveByRole = (conn, roleName) =>
  run(
    conn,
    `SELECT COUNT(*) AS total
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
      WHERE r.role_name = ? AND u.status = 'active' AND u.deleted_at IS NULL`,
    [roleName]
  ).then((rows) => Number(rows[0]?.total ?? 0));

export const softDelete = (conn, id, { reason, deletedBy } = {}) =>
  run(
    conn,
    `UPDATE users
        SET deleted_at = NOW(), delete_reason = ?, deleted_by = ?, status = 'inactive'
      WHERE user_id = ?`,
    [reason ?? null, deletedBy ?? null, id]
  );

export const restore = (conn, id) =>
  run(
    conn,
    `UPDATE users
        SET deleted_at = NULL, delete_reason = NULL, deleted_by = NULL, status = 'active'
      WHERE user_id = ?`,
    [id]
  );

export default {
  findByUsername,
  findByIdWithPassword,
  findById,
  findByIdIncludingDeleted,
  list,
  count,
  updateUsername,
  updatePassword,
  updateProfile,
  touchLastLogin,
  usernameExists,
  create,
  update,
  setStatus,
  countActiveByRole,
  softDelete,
  restore,
};
