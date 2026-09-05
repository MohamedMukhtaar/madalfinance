import run from './_base.js';

const INCOME_COLS = `
  oi.*,
  oi.account_id AS acc_id,
  a.account_name AS institution,
  a.account_number AS number
`;

export const findById = (conn, id) =>
  run(
    conn,
    `SELECT ${INCOME_COLS}
       FROM other_income oi
       LEFT JOIN accounts a ON a.account_id = oi.account_id
      WHERE oi.income_id = ? AND oi.deleted_at IS NULL`,
    [id]
  ).then((rows) => rows[0]);

export const findByIdIncludingDeleted = (conn, id) =>
  run(
    conn,
    `SELECT ${INCOME_COLS}
       FROM other_income oi
       LEFT JOIN accounts a ON a.account_id = oi.account_id
      WHERE oi.income_id = ?`,
    [id]
  ).then((rows) => rows[0]);

const buildWhere = ({ search, categoryId, fromDate, toDate, accId }) => {
  const conditions = ['oi.deleted_at IS NULL'];
  const params = [];
  if (categoryId) {
    conditions.push('oi.category_name = ?');
    params.push(categoryId);
  }
  if (fromDate) {
    conditions.push('oi.income_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('oi.income_date <= ?');
    params.push(toDate);
  }
  if (accId) {
    conditions.push('oi.account_id = ?');
    params.push(accId);
  }
  if (search) {
    conditions.push('(oi.description ILIKE ? OR oi.category_name ILIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  return { where: `WHERE ${conditions.join(' AND ')}`, params };
};

export const list = (conn, filters) => {
  const { search, categoryId, fromDate, toDate, accId, offset, perPage, order } = filters;
  const { where, params } = buildWhere({ search, categoryId, fromDate, toDate, accId });
  const qualifiedOrder = String(order || "income_date DESC").replace(/^([A-Za-z_]+)/, "oi.$1");
  return run(
    conn,
    `SELECT ${INCOME_COLS}
       FROM other_income oi
       LEFT JOIN accounts a ON a.account_id = oi.account_id
      ${where}
      ORDER BY ${qualifiedOrder}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, filters) => {
  const { where, params } = buildWhere(filters);
  return run(
    conn,
    `SELECT COUNT(*) AS total FROM other_income oi ${where}`,
    params
  ).then((r) => r[0].total);
};

export const create = (conn, data) => {
  const { category_name, description, amount, income_date, acc_id, received_by, notes } = data;
  return run(
    conn,
    `INSERT INTO other_income (category_name, description, amount, income_date, account_id, received_by, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [category_name || 'Other', description ?? null, amount, income_date, acc_id, received_by, notes ?? null]
  ).then((r) => r.insertId);
};

export const update = (conn, id, data) => {
  const { category_name, description, amount, income_date, notes } = data;
  return run(
    conn,
    `UPDATE other_income SET
        category_name = COALESCE(?, category_name),
        description   = COALESCE(?, description),
        amount        = COALESCE(?, amount),
        income_date   = COALESCE(?, income_date),
        notes         = COALESCE(?, notes)
      WHERE income_id = ? AND deleted_at IS NULL`,
    [category_name ?? null, description ?? null, amount ?? null, income_date ?? null, notes ?? null, id]
  );
};

export const softDelete = (conn, id, { reason, deletedBy } = {}) =>
  run(
    conn,
    `UPDATE other_income SET deleted_at = NOW(), delete_reason = ?, deleted_by = ? WHERE income_id = ?`,
    [reason ?? null, deletedBy ?? null, id]
  );

export const restore = (conn, id) =>
  run(conn, `UPDATE other_income SET deleted_at = NULL, delete_reason = NULL, deleted_by = NULL WHERE income_id = ?`, [id]);

export const categories = (conn) =>
  run(
    conn,
    `SELECT DISTINCT category_name FROM other_income WHERE deleted_at IS NULL ORDER BY category_name`
  );

export default {
  findById,
  findByIdIncludingDeleted,
  list,
  count,
  create,
  update,
  softDelete,
  restore,
  categories,
};
