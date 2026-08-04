import run from './_base.js';

export const findById = (conn, id) =>
  run(conn, `SELECT * FROM contracts WHERE contract_id = ? AND deleted_at IS NULL`, [id]).then(
    (rows) => rows[0]
  );

export const findByNumber = (conn, number) =>
  run(conn, `SELECT * FROM contracts WHERE contract_number = ?`, [number]).then((rows) => rows[0]);

export const list = (conn, { search, status, customerId, projectId, offset, perPage, order }) => {
  const conditions = ['c.deleted_at IS NULL'];
  const params = [];
  if (status) {
    conditions.push('c.status = ?');
    params.push(status);
  }
  if (customerId) {
    conditions.push('c.customer_id = ?');
    params.push(customerId);
  }
  if (projectId) {
    conditions.push('c.project_id = ?');
    params.push(projectId);
  }
  if (search) {
    conditions.push('(c.contract_number LIKE ? OR cust.customer_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return run(
    conn,
    `SELECT c.*, cust.customer_name
       FROM contracts c
       JOIN customers cust ON cust.customer_id = c.customer_id
       ${where}
      ORDER BY ${order}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, { search, status, customerId, projectId }) => {
  const conditions = ['c.deleted_at IS NULL'];
  const params = [];
  if (status) {
    conditions.push('c.status = ?');
    params.push(status);
  }
  if (customerId) {
    conditions.push('c.customer_id = ?');
    params.push(customerId);
  }
  if (projectId) {
    conditions.push('c.project_id = ?');
    params.push(projectId);
  }
  if (search) {
    conditions.push('(c.contract_number LIKE ? OR cust.customer_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  return run(
    conn,
    `SELECT COUNT(*) AS total FROM contracts c JOIN customers cust ON cust.customer_id = c.customer_id WHERE ${conditions.join(' AND ')}`,
    params
  ).then((r) => r[0].total);
};

export const create = (conn, data) => {
  const {
    customer_id, project_id, contract_number, contract_date, start_date, end_date,
    contract_amount, remarks, status, created_by,
  } = data;
  return run(
    conn,
    `INSERT INTO contracts (customer_id, project_id, contract_number, contract_date, start_date, end_date, contract_amount, remarks, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [customer_id, project_id ?? null, contract_number, contract_date, start_date ?? null, end_date ?? null, contract_amount, remarks ?? null, status ?? 'active', created_by]
  ).then((r) => r.insertId);
};

export const update = (conn, id, data) => {
  const { contract_date, start_date, end_date, contract_amount, remarks, status } = data;
  return run(
    conn,
    `UPDATE contracts SET
        contract_date    = COALESCE(?, contract_date),
        start_date       = COALESCE(?, start_date),
        end_date         = COALESCE(?, end_date),
        contract_amount  = COALESCE(?, contract_amount),
        remarks          = COALESCE(?, remarks),
        status           = COALESCE(?, status)
      WHERE contract_id = ? AND deleted_at IS NULL`,
    [contract_date ?? null, start_date ?? null, end_date ?? null, contract_amount ?? null, remarks ?? null, status ?? null, id]
  );
};

export const saveSignedAgreement = (conn, id, { file_name, file_path }) =>
  run(conn, `UPDATE contracts SET signed_file_name = ?, signed_file_path = ? WHERE contract_id = ?`, [
    file_name,
    file_path,
    id,
  ]);

export const softDelete = (conn, id, { reason, deletedBy } = {}) =>
  run(
    conn,
    `UPDATE contracts SET deleted_at = NOW(), delete_reason = ?, deleted_by = ? WHERE contract_id = ?`,
    [reason ?? null, deletedBy ?? null, id]
  );

export const restore = (conn, id) =>
  run(conn, `UPDATE contracts SET deleted_at = NULL, delete_reason = NULL, deleted_by = NULL WHERE contract_id = ?`, [id]);

export default {
  findById,
  findByNumber,
  list,
  count,
  create,
  update,
  saveSignedAgreement,
  softDelete,
  restore,
};
