import run from './_base.js';

const publicCols = `
  u.user_id, u.username, u.full_name, u.phone, u.email, u.status,
  u.last_login, u.created_at, u.updated_at, r.role_name AS role
`;

export const findByUsername = (conn, username) =>
  run(
    conn,
    `SELECT u.user_id, u.username, u.password, u.full_name, u.phone, u.email, u.status,
            r.role_name AS role
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
      WHERE u.username = ? AND u.status = 'active'`,
    [username]
  ).then((rows) => rows[0]);

export const findById = (conn, id) =>
  run(
    conn,
    `SELECT ${publicCols} FROM users u JOIN roles r ON r.role_id = u.role_id WHERE u.user_id = ?`,
    [id]
  ).then((rows) => rows[0]);

export const list = (conn, { search, offset, perPage, order }) => {
  const where = search
    ? `WHERE (u.username LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)`
    : '';
  const params = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
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
  const where = search ? `WHERE (username LIKE ? OR full_name LIKE ? OR email LIKE ?)` : '';
  const params = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
  return run(conn, `SELECT COUNT(*) AS total FROM users u ${where}`, params).then((r) => r[0].total);
};

export const updateUsername = (conn, id, username) =>
  run(conn, `UPDATE users SET username = ? WHERE user_id = ?`, [username, id]);

export const updatePassword = (conn, id, hash) =>
  run(conn, `UPDATE users SET password = ? WHERE user_id = ?`, [hash, id]);

export const updateProfile = (conn, id, { full_name, phone, email }) =>
  run(
    conn,
    `UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), email = COALESCE(?, email) WHERE user_id = ?`,
    [full_name ?? null, phone ?? null, email ?? null, id]
  );

export const touchLastLogin = (conn, id) =>
  run(conn, `UPDATE users SET last_login = NOW() WHERE user_id = ?`, [id]);

export default {
  findByUsername,
  findById,
  list,
  count,
  updateUsername,
  updatePassword,
  updateProfile,
  touchLastLogin,
};
