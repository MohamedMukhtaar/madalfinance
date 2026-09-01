import run from './_base.js';

export const list = (conn) =>
  run(
    conn,
    `SELECT r.role_id, r.role_name,
            COUNT(u.user_id) AS user_count
       FROM roles r
       LEFT JOIN users u ON u.role_id = r.role_id AND u.deleted_at IS NULL
      GROUP BY r.role_id, r.role_name
      ORDER BY r.role_name ASC`
  );

export const findById = (conn, id) =>
  run(conn, `SELECT role_id, role_name FROM roles WHERE role_id = ?`, [id]).then((rows) => rows[0]);

export const findByName = (conn, roleName) =>
  run(conn, `SELECT role_id, role_name FROM roles WHERE role_name = ?`, [roleName]).then(
    (rows) => rows[0]
  );

export const nameExists = (conn, roleName, excludeRoleId = null) => {
  const params = [roleName];
  let sql = `SELECT role_id FROM roles WHERE role_name = ?`;
  if (excludeRoleId) {
    sql += ` AND role_id != ?`;
    params.push(excludeRoleId);
  }
  return run(conn, sql, params).then((rows) => rows.length > 0);
};

export const countUsers = (conn, roleId) =>
  run(
    conn,
    `SELECT COUNT(*) AS total FROM users WHERE role_id = ? AND deleted_at IS NULL`,
    [roleId]
  ).then((rows) => Number(rows[0]?.total ?? 0));

export const create = (conn, roleName) =>
  run(conn, `INSERT INTO roles (role_name) VALUES (?)`, [roleName]).then((r) => r.insertId);

export const update = (conn, id, roleName) =>
  run(conn, `UPDATE roles SET role_name = ? WHERE role_id = ?`, [roleName, id]);

export const remove = (conn, id) => run(conn, `DELETE FROM roles WHERE role_id = ?`, [id]);

export default {
  list,
  findById,
  findByName,
  nameExists,
  countUsers,
  create,
  update,
  remove,
};
