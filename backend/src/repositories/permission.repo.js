import run from './_base.js';

export const list = (conn) =>
  run(
    conn,
    `SELECT permission_id, permission_name, guard_name, module, action, created_at, updated_at
       FROM permissions
      ORDER BY module ASC, action ASC`
  );

export const findByName = (conn, name) =>
  run(conn, `SELECT * FROM permissions WHERE permission_name = ?`, [name]).then((rows) => rows[0]);

export const upsert = (conn, { name, module, action, guardName = 'web' }) =>
  run(
    conn,
    `INSERT INTO permissions (permission_name, guard_name, module, action)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (permission_name, guard_name)
     DO UPDATE SET module = EXCLUDED.module, action = EXCLUDED.action, updated_at = now()`,
    [name, guardName, module, action]
  );

export const namesForUser = (conn, userId) =>
  run(
    conn,
    `SELECT DISTINCT p.permission_name
       FROM permissions p
       JOIN role_has_permissions rhp ON rhp.permission_id = p.permission_id
       JOIN users u ON u.role_id = rhp.role_id
      WHERE u.user_id = ? AND u.deleted_at IS NULL
     UNION
     SELECT p.permission_name
       FROM permissions p
       JOIN user_has_permissions uhp ON uhp.permission_id = p.permission_id
      WHERE uhp.user_id = ?
      ORDER BY 1`,
    [userId, userId]
  ).then((rows) => rows.map((r) => r.permission_name));

export const namesForRole = (conn, roleId) =>
  run(
    conn,
    `SELECT p.permission_name
       FROM permissions p
       JOIN role_has_permissions rhp ON rhp.permission_id = p.permission_id
      WHERE rhp.role_id = ?
      ORDER BY p.module, p.action`,
    [roleId]
  ).then((rows) => rows.map((r) => r.permission_name));

export const replaceRolePermissions = async (conn, roleId, permissionNames) => {
  await run(conn, `DELETE FROM role_has_permissions WHERE role_id = ?`, [roleId]);
  if (!permissionNames?.length) return;
  const rows = await run(
    conn,
    `SELECT permission_id FROM permissions WHERE permission_name = ANY(?::text[])`,
    [permissionNames]
  );
  for (const row of rows) {
    await run(
      conn,
      `INSERT INTO role_has_permissions (permission_id, role_id)
       VALUES (?, ?)
       ON CONFLICT DO NOTHING`,
      [row.permission_id, roleId]
    );
  }
};

export const grantRoleAll = async (conn, roleId) => {
  await run(
    conn,
    `INSERT INTO role_has_permissions (permission_id, role_id)
     SELECT permission_id, ? FROM permissions
     ON CONFLICT DO NOTHING`,
    [roleId]
  );
};

export const grantRoleNames = async (conn, roleId, permissionNames) => {
  if (!permissionNames?.length) return;
  await run(
    conn,
    `INSERT INTO role_has_permissions (permission_id, role_id)
     SELECT permission_id, ?
       FROM permissions
      WHERE permission_name = ANY(?::text[])
     ON CONFLICT DO NOTHING`,
    [roleId, permissionNames]
  );
};

export default {
  list,
  findByName,
  upsert,
  namesForUser,
  namesForRole,
  replaceRolePermissions,
  grantRoleAll,
  grantRoleNames,
};
