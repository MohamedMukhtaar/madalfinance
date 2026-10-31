import run from './_base.js';

export const list = (conn) =>
  run(
    conn,
    `SELECT r.role_id, r.role_name, r.description, r.is_system, r.guard_name, r.created_at, r.updated_at,
            COUNT(DISTINCT u.user_id) AS user_count,
            COALESCE(
              array_agg(p.permission_name ORDER BY p.permission_name)
                FILTER (WHERE p.permission_name IS NOT NULL),
              '{}'
            ) AS permissions
       FROM roles r
       LEFT JOIN users u ON u.role_id = r.role_id AND u.deleted_at IS NULL
       LEFT JOIN role_has_permissions rhp ON rhp.role_id = r.role_id
       LEFT JOIN permissions p ON p.permission_id = rhp.permission_id
      WHERE r.deleted_at IS NULL
      GROUP BY r.role_id
      ORDER BY r.is_system DESC, r.role_name ASC`
  );

export const findById = (conn, id) =>
  run(
    conn,
    `SELECT r.role_id, r.role_name, r.description, r.is_system, r.guard_name, r.created_at, r.updated_at,
            COUNT(DISTINCT u.user_id) AS user_count,
            COALESCE(
              array_agg(p.permission_name ORDER BY p.permission_name)
                FILTER (WHERE p.permission_name IS NOT NULL),
              '{}'
            ) AS permissions
       FROM roles r
       LEFT JOIN users u ON u.role_id = r.role_id AND u.deleted_at IS NULL
       LEFT JOIN role_has_permissions rhp ON rhp.role_id = r.role_id
       LEFT JOIN permissions p ON p.permission_id = rhp.permission_id
      WHERE r.role_id = ? AND r.deleted_at IS NULL
      GROUP BY r.role_id`,
    [id]
  ).then((rows) => rows[0]);

export const findByName = (conn, roleName) =>
  run(
    conn,
    `SELECT role_id, role_name, description, is_system FROM roles WHERE role_name = ? AND deleted_at IS NULL`,
    [roleName]
  ).then((rows) => rows[0]);

export const nameExists = (conn, roleName, excludeRoleId = null) => {
  const params = [roleName];
  let sql = `SELECT role_id FROM roles WHERE role_name = ? AND deleted_at IS NULL`;
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

export const create = (conn, { roleName, description = null }) =>
  run(conn, `INSERT INTO roles (role_name, description) VALUES (?, ?)`, [roleName, description]).then(
    (r) => r.insertId
  );

export const update = (conn, id, { roleName, description }) =>
  run(conn, `UPDATE roles SET role_name = ?, description = ?, updated_at = now() WHERE role_id = ?`, [
    roleName,
    description ?? null,
    id,
  ]);

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
