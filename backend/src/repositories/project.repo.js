import run from './_base.js';

const select = `
  SELECT p.*, pt.type_name AS project_type,
         c.customer_name, c.customer_code,
         (SELECT COALESCE(SUM(total_amount - paid_amount), 0) FROM invoices i
           WHERE i.project_id = p.project_id AND i.deleted_at IS NULL AND i.status IN ('Issued','Partial','Overdue')) AS outstanding
    FROM projects p
    JOIN project_types pt ON pt.project_type_id = p.project_type_id
    JOIN customers c ON c.customer_id = p.customer_id`;

export const findById = (conn, id) =>
  run(conn, `${select} WHERE p.project_id = ? AND p.deleted_at IS NULL`, [id]).then((rows) => rows[0]);

export const list = (conn, { search, status, projectType, customerId, offset, perPage, order }) => {
  const conditions = ['p.deleted_at IS NULL'];
  const params = [];
  if (status) {
    conditions.push('p.status = ?');
    params.push(status);
  }
  if (projectType) {
    conditions.push('pt.type_name = ?');
    params.push(projectType);
  }
  if (customerId) {
    conditions.push('p.customer_id = ?');
    params.push(customerId);
  }
  if (search) {
    conditions.push('(p.project_name LIKE ? OR c.customer_name LIKE ? OR c.customer_code LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return run(
    conn,
    `${select} ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, { search, status, projectType, customerId }) => {
  const conditions = ['p.deleted_at IS NULL'];
  const params = [];
  if (status) {
    conditions.push('p.status = ?');
    params.push(status);
  }
  if (projectType) {
    conditions.push('pt.type_name = ?');
    params.push(projectType);
  }
  if (customerId) {
    conditions.push('p.customer_id = ?');
    params.push(customerId);
  }
  if (search) {
    conditions.push('(p.project_name LIKE ? OR c.customer_name LIKE ? OR c.customer_code LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  return run(
    conn,
    `SELECT COUNT(*) AS total FROM projects p
       JOIN project_types pt ON pt.project_type_id = p.project_type_id
       JOIN customers c ON c.customer_id = p.customer_id
      WHERE ${conditions.join(' AND ')}`,
    params
  ).then((r) => r[0].total);
};

export const create = (conn, data) => {
  const { customer_id, project_type_id, project_name, description, project_price, start_date, expected_finish, status, created_by } = data;
  return run(
    conn,
    `INSERT INTO projects (customer_id, project_type_id, project_name, description, project_price, start_date, expected_finish, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [customer_id, project_type_id, project_name, description ?? null, project_price, start_date ?? null, expected_finish ?? null, status ?? 'Pending', created_by]
  ).then((r) => r.insertId);
};

export const update = (conn, id, data) => {
  const { project_name, description, project_price, start_date, expected_finish, completed_date, status } = data;
  return run(
    conn,
    `UPDATE projects SET
        project_name     = COALESCE(?, project_name),
        description      = COALESCE(?, description),
        project_price    = COALESCE(?, project_price),
        start_date       = COALESCE(?, start_date),
        expected_finish  = COALESCE(?, expected_finish),
        completed_date   = COALESCE(?, completed_date),
        status           = COALESCE(?, status)
      WHERE project_id = ? AND deleted_at IS NULL`,
    [project_name ?? null, description ?? null, project_price ?? null, start_date ?? null, expected_finish ?? null, completed_date ?? null, status ?? null, id]
  );
};

export const softDelete = (conn, id, { reason, deletedBy } = {}) =>
  run(
    conn,
    `UPDATE projects SET deleted_at = NOW(), delete_reason = ?, deleted_by = ? WHERE project_id = ?`,
    [reason ?? null, deletedBy ?? null, id]
  );

export const restore = (conn, id) =>
  run(conn, `UPDATE projects SET deleted_at = NULL, delete_reason = NULL, deleted_by = NULL WHERE project_id = ?`, [id]);

export const typeByName = (conn, name) =>
  run(conn, `SELECT * FROM project_types WHERE type_name = ?`, [name]).then((rows) => rows[0]);

export const listTypes = (conn) => run(conn, `SELECT * FROM project_types ORDER BY project_type_id`);

export default { findById, list, count, create, update, softDelete, restore, typeByName, listTypes };
