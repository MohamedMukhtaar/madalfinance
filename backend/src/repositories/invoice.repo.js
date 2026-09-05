import run from './_base.js';

export const findById = (conn, id) =>
  run(conn, `SELECT * FROM invoices WHERE invoice_id = ? AND deleted_at IS NULL`, [id]).then(
    (rows) => rows[0]
  );

export const findByIdForUpdate = (conn, id) =>
  run(conn, `SELECT * FROM invoices WHERE invoice_id = ? AND deleted_at IS NULL FOR UPDATE`, [id]).then(
    (rows) => rows[0]
  );

export const findByNumber = (conn, number) =>
  run(conn, `SELECT * FROM invoices WHERE invoice_number = ?`, [number]).then((rows) => rows[0]);

/** Find monthly rental invoice for a project + period label (e.g. "Sep 2026"). */
export const findRentalMonthlyForPeriod = (conn, projectId, periodLabel) =>
  run(
    conn,
    `SELECT i.*
       FROM invoices i
       JOIN invoice_items ii ON ii.invoice_id = i.invoice_id
      WHERE i.project_id = ?
        AND i.deleted_at IS NULL
        AND ii.description ILIKE ?
      LIMIT 1`,
    [projectId, `%(${periodLabel})%`]
  ).then((rows) => rows[0]);

export const list = (conn, { search, status, customerId, fromDate, toDate, offset, perPage, order }) => {
  const conditions = ['i.deleted_at IS NULL'];
  const params = [];
  if (status) {
    conditions.push('i.status = ?');
    params.push(status);
  }
  if (customerId) {
    conditions.push('i.customer_id = ?');
    params.push(customerId);
  }
  if (fromDate) {
    conditions.push('i.invoice_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('i.invoice_date <= ?');
    params.push(toDate);
  }
  if (search) {
    conditions.push('(i.invoice_number ILIKE ? OR c.customer_name ILIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return run(
    conn,
    `SELECT i.*, c.customer_name, COALESCE(p.project_name, '') AS project_name,
            (SELECT ii.description FROM invoice_items ii WHERE ii.invoice_id = i.invoice_id ORDER BY ii.item_id LIMIT 1) AS first_item_description,
            (SELECT COALESCE(SUM(pa.amount_allocated), 0) FROM payment_allocations pa WHERE pa.invoice_id = i.invoice_id) AS allocated
       FROM invoices i
       JOIN customers c ON c.customer_id = i.customer_id
       LEFT JOIN projects p ON p.project_id = i.project_id
       ${where}
      ORDER BY ${order}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, { search, status, customerId, fromDate, toDate }) => {
  const conditions = ['i.deleted_at IS NULL'];
  const params = [];
  if (status) {
    conditions.push('i.status = ?');
    params.push(status);
  }
  if (customerId) {
    conditions.push('i.customer_id = ?');
    params.push(customerId);
  }
  if (fromDate) {
    conditions.push('i.invoice_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('i.invoice_date <= ?');
    params.push(toDate);
  }
  if (search) {
    conditions.push('(i.invoice_number ILIKE ? OR c.customer_name ILIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  return run(
    conn,
    `SELECT COUNT(*) AS total FROM invoices i JOIN customers c ON c.customer_id = i.customer_id WHERE ${conditions.join(' AND ')}`,
    params
  ).then((r) => r[0].total);
};

export const create = (conn, data) => {
  const {
    invoice_number, customer_id, project_id, contract_id, invoice_date, due_date,
    subtotal, discount, tax, total_amount, status, created_by,
  } = data;
  return run(
    conn,
    `INSERT INTO invoices (invoice_number, customer_id, project_id, invoice_date, due_date,
                           subtotal, discount, tax, total_amount, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invoice_number, customer_id, project_id ?? null, invoice_date,
      due_date ?? null, subtotal, discount, tax, total_amount, status ?? 'Draft', created_by,
    ]
  ).then((r) => r.insertId);
};

export const update = (conn, id, data) => {
  const { invoice_date, due_date, subtotal, discount, tax, total_amount } = data;
  return run(
    conn,
    `UPDATE invoices SET
        invoice_date = COALESCE(?, invoice_date),
        due_date     = COALESCE(?, due_date),
        subtotal     = COALESCE(?, subtotal),
        discount     = COALESCE(?, discount),
        tax          = COALESCE(?, tax),
        total_amount = COALESCE(?, total_amount)
      WHERE invoice_id = ? AND deleted_at IS NULL`,
    [invoice_date ?? null, due_date ?? null, subtotal ?? null, discount ?? null, tax ?? null, total_amount ?? null, id]
  );
};

export const updateStatus = (conn, id, status) =>
  run(conn, `UPDATE invoices SET status = ? WHERE invoice_id = ?`, [status, id]);

export const applyPaidAmount = (conn, id, paidAmount, status) =>
  run(conn, `UPDATE invoices SET paid_amount = ? WHERE invoice_id = ?`, [paidAmount, id]).then(() =>
    status ? updateStatus(conn, id, status) : null
  );

export const softDelete = (conn, id, { reason, deletedBy } = {}) =>
  run(
    conn,
    `UPDATE invoices SET deleted_at = NOW(), delete_reason = ?, deleted_by = ? WHERE invoice_id = ?`,
    [reason ?? null, deletedBy ?? null, id]
  );

export const restore = (conn, id) =>
  run(conn, `UPDATE invoices SET deleted_at = NULL, delete_reason = NULL, deleted_by = NULL WHERE invoice_id = ?`, [id]);

export const items = (conn, invoiceId) =>
  run(conn, `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY item_id`, [invoiceId]);

export const replaceItems = async (conn, invoiceId, items) => {
  await run(conn, `DELETE FROM invoice_items WHERE invoice_id = ?`, [invoiceId]);
  for (const item of items) {
    const total = Number(item.quantity || 1) * Number(item.unit_price || 0);
    await run(
      conn,
      `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price) VALUES (?, ?, ?, ?)`,
      [invoiceId, item.description, item.quantity ?? 1, item.unit_price ?? 0]
    );
  }
};

export const attachments = (conn, invoiceId) =>
  run(conn, `SELECT * FROM invoice_attachments WHERE invoice_id = ? ORDER BY uploaded_at DESC`, [invoiceId]);

export const addAttachment = (conn, invoiceId, { file_name, file_path, file_type, uploaded_by }) =>
  run(
    conn,
    `INSERT INTO invoice_attachments (invoice_id, file_name, file_path, file_type, uploaded_by) VALUES (?, ?, ?, ?, ?)`,
    [invoiceId, file_name, file_path, file_type, uploaded_by]
  ).then((r) => r.insertId);

export const deleteAttachment = (conn, attachmentId) =>
  run(conn, `DELETE FROM invoice_attachments WHERE attachment_id = ?`, [attachmentId]);

export const findAttachment = (conn, attachmentId) =>
  run(conn, `SELECT * FROM invoice_attachments WHERE attachment_id = ?`, [attachmentId]).then((rows) => rows[0]);

/** Invoices with an outstanding balance that are overdue (used by the daily job). */
export const outstandingForCustomer = (conn, customerId) =>
  run(
    conn,
    `SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS total FROM invoices
      WHERE customer_id = ? AND deleted_at IS NULL AND status IN ('Issued','Partial','Overdue')`,
    [customerId]
  ).then((r) => r[0].total);

export const overdue = (conn, today) =>
  run(
    conn,
    `SELECT * FROM invoices
      WHERE deleted_at IS NULL
        AND status IN ('Issued', 'Partial')
        AND due_date IS NOT NULL
        AND due_date < ?
        AND total_amount - paid_amount > 0`,
    [today]
  );

export default {
  findById,
  findByIdForUpdate,
  findByNumber,
  findRentalMonthlyForPeriod,
  list,
  count,
  create,
  update,
  updateStatus,
  applyPaidAmount,
  softDelete,
  restore,
  items,
  replaceItems,
  attachments,
  addAttachment,
  deleteAttachment,
  findAttachment,
  outstandingForCustomer,
  overdue,
};
