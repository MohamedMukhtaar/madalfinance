import run from './_base.js';

export const findById = (conn, id) =>
  run(conn, `SELECT * FROM other_income WHERE income_id = ? AND deleted_at IS NULL`, [id]).then(
    (rows) => rows[0]
  );

export const findByIdIncludingDeleted = (conn, id) =>
  run(conn, `SELECT * FROM other_income WHERE income_id = ?`, [id]).then((rows) => rows[0]);

export const list = (conn, { search, categoryId, fromDate, toDate, offset, perPage, order }) => {
  const conditions = ['i.deleted_at IS NULL'];
  const params = [];
  if (categoryId) {
    conditions.push('i.income_category_id = ?');
    params.push(categoryId);
  }
  if (fromDate) {
    conditions.push('i.income_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('i.income_date <= ?');
    params.push(toDate);
  }
  if (search) {
    conditions.push('(i.description LIKE ? OR ic.category_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return run(
    conn,
    `SELECT i.*, ic.category_name
       FROM other_income i JOIN income_categories ic ON ic.income_category_id = i.income_category_id
       ${where}
      ORDER BY ${order}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, { search, categoryId, fromDate, toDate }) => {
  const conditions = ['i.deleted_at IS NULL'];
  const params = [];
  if (categoryId) {
    conditions.push('i.income_category_id = ?');
    params.push(categoryId);
  }
  if (fromDate) {
    conditions.push('i.income_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('i.income_date <= ?');
    params.push(toDate);
  }
  if (search) {
    conditions.push('(i.description LIKE ? OR ic.category_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  return run(
    conn,
    `SELECT COUNT(*) AS total FROM other_income i JOIN income_categories ic ON ic.income_category_id = i.income_category_id WHERE ${conditions.join(' AND ')}`,
    params
  ).then((r) => r[0].total);
};

export const create = (conn, data) => {
  const { income_category_id, description, amount, income_date, received_by, notes } = data;
  return run(
    conn,
    `INSERT INTO other_income (income_category_id, description, amount, income_date, received_by, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [income_category_id, description ?? null, amount, income_date, received_by, notes ?? null]
  ).then((r) => r.insertId);
};

export const update = (conn, id, data) => {
  const { income_category_id, description, amount, income_date, notes } = data;
  return run(
    conn,
    `UPDATE other_income SET
        income_category_id = COALESCE(?, income_category_id),
        description        = COALESCE(?, description),
        amount             = COALESCE(?, amount),
        income_date        = COALESCE(?, income_date),
        notes              = COALESCE(?, notes)
      WHERE income_id = ? AND deleted_at IS NULL`,
    [income_category_id ?? null, description ?? null, amount ?? null, income_date ?? null, notes ?? null, id]
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
  run(conn, `SELECT * FROM income_categories ORDER BY category_name`);

export const createCategory = (conn, name) =>
  run(conn, `INSERT INTO income_categories (category_name) VALUES (?)`, [name]).then((r) => r.insertId);

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
  createCategory,
};
