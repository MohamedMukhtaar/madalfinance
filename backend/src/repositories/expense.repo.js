import run from './_base.js';

export const findById = (conn, id) =>
  run(conn, `SELECT * FROM expenses WHERE expense_id = ? AND deleted_at IS NULL`, [id]).then(
    (rows) => rows[0]
  );

export const findByIdIncludingDeleted = (conn, id) =>
  run(conn, `SELECT * FROM expenses WHERE expense_id = ?`, [id]).then((rows) => rows[0]);

export const list = (conn, { search, categoryId, method, fromDate, toDate, offset, perPage, order }) => {
  const conditions = ['e.deleted_at IS NULL'];
  const params = [];
  if (categoryId) {
    conditions.push('e.expense_category_id = ?');
    params.push(categoryId);
  }
  if (method) {
    conditions.push('e.payment_method = ?');
    params.push(method);
  }
  if (fromDate) {
    conditions.push('e.expense_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('e.expense_date <= ?');
    params.push(toDate);
  }
  if (search) {
    conditions.push('(e.description LIKE ? OR e.reference_number LIKE ? OR ec.category_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return run(
    conn,
    `SELECT e.*, ec.category_name,
            a.number AS account_number, a.institution AS account_institution
       FROM expenses e JOIN expense_categories ec ON ec.expense_category_id = e.expense_category_id
       LEFT JOIN accounts a ON a.acc_id = e.acc_id
       ${where}
      ORDER BY ${order}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, { search, categoryId, method, fromDate, toDate }) => {
  const conditions = ['e.deleted_at IS NULL'];
  const params = [];
  if (categoryId) {
    conditions.push('e.expense_category_id = ?');
    params.push(categoryId);
  }
  if (method) {
    conditions.push('e.payment_method = ?');
    params.push(method);
  }
  if (fromDate) {
    conditions.push('e.expense_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('e.expense_date <= ?');
    params.push(toDate);
  }
  if (search) {
    conditions.push('(e.description LIKE ? OR e.reference_number LIKE ? OR ec.category_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  return run(
    conn,
    `SELECT COUNT(*) AS total FROM expenses e JOIN expense_categories ec ON ec.expense_category_id = e.expense_category_id WHERE ${conditions.join(' AND ')}`,
    params
  ).then((r) => r[0].total);
};

export const create = (conn, data) => {
  const {
    expense_category_id, expense_date, description, amount, acc_id, paid_by, payment_method,
    reference_number, notes, created_by,
  } = data;
  return run(
    conn,
    `INSERT INTO expenses (expense_category_id, expense_date, description, amount, acc_id, paid_by, payment_method, reference_number, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [expense_category_id, expense_date, description ?? null, amount, acc_id ?? null, paid_by ?? null, payment_method ?? 'Cash', reference_number ?? null, notes ?? null, created_by]
  ).then((r) => r.insertId);
};

export const update = (conn, id, data) => {
  const { expense_category_id, expense_date, description, amount, paid_by, payment_method, reference_number, notes } = data;
  return run(
    conn,
    `UPDATE expenses SET
        expense_category_id = COALESCE(?, expense_category_id),
        expense_date        = COALESCE(?, expense_date),
        description         = COALESCE(?, description),
        amount              = COALESCE(?, amount),
        paid_by             = COALESCE(?, paid_by),
        payment_method      = COALESCE(?, payment_method),
        reference_number    = COALESCE(?, reference_number),
        notes               = COALESCE(?, notes)
      WHERE expense_id = ? AND deleted_at IS NULL`,
    [expense_category_id ?? null, expense_date ?? null, description ?? null, amount ?? null, paid_by ?? null, payment_method ?? null, reference_number ?? null, notes ?? null, id]
  );
};

export const softDelete = (conn, id, { reason, deletedBy } = {}) =>
  run(
    conn,
    `UPDATE expenses SET deleted_at = NOW(), delete_reason = ?, deleted_by = ? WHERE expense_id = ?`,
    [reason ?? null, deletedBy ?? null, id]
  );

export const restore = (conn, id) =>
  run(conn, `UPDATE expenses SET deleted_at = NULL, delete_reason = NULL, deleted_by = NULL WHERE expense_id = ?`, [id]);

export const attachments = (conn, expenseId) =>
  run(conn, `SELECT * FROM expense_attachments WHERE expense_id = ? ORDER BY uploaded_at DESC`, [expenseId]);

export const addAttachment = (conn, expenseId, { file_name, file_path, file_type }) =>
  run(
    conn,
    `INSERT INTO expense_attachments (expense_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)`,
    [expenseId, file_name, file_path, file_type]
  ).then((r) => r.insertId);

export const findAttachment = (conn, attachmentId) =>
  run(conn, `SELECT * FROM expense_attachments WHERE attachment_id = ?`, [attachmentId]).then((rows) => rows[0]);

export const deleteAttachment = (conn, attachmentId) =>
  run(conn, `DELETE FROM expense_attachments WHERE attachment_id = ?`, [attachmentId]);

export const categories = (conn) =>
  run(conn, `SELECT * FROM expense_categories ORDER BY category_name`);

export const createCategory = (conn, name) =>
  run(conn, `INSERT INTO expense_categories (category_name) VALUES (?)`, [name]).then((r) => r.insertId);

export default {
  findById,
  findByIdIncludingDeleted,
  list,
  count,
  create,
  update,
  softDelete,
  restore,
  attachments,
  addAttachment,
  findAttachment,
  deleteAttachment,
  categories,
  createCategory,
};
