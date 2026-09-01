import run from './_base.js';

export const findById = (conn, id) =>
  run(conn, `SELECT * FROM payments WHERE payment_id = ? AND deleted_at IS NULL`, [id]).then(
    (rows) => rows[0]
  );

export const findByIdIncludingDeleted = (conn, id) =>
  run(conn, `SELECT * FROM payments WHERE payment_id = ?`, [id]).then((rows) => rows[0]);

export const list = (conn, { search, customerId, method, fromDate, toDate, offset, perPage, order }) => {
  const conditions = ['p.deleted_at IS NULL'];
  const params = [];
  if (customerId) {
    conditions.push('p.customer_id = ?');
    params.push(customerId);
  }
  if (method) {
    conditions.push('p.payment_method = ?');
    params.push(method);
  }
  if (fromDate) {
    conditions.push('p.payment_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('p.payment_date <= ?');
    params.push(toDate);
  }
  if (search) {
    conditions.push('(p.payment_number LIKE ? OR c.customer_name LIKE ? OR p.reference_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return run(
    conn,
    `SELECT p.*, c.customer_name, u.full_name AS received_by_name,
            a.number AS account_number, a.institution AS account_institution
       FROM payments p
       JOIN customers c ON c.customer_id = p.customer_id
       JOIN users u ON u.user_id = p.received_by
       LEFT JOIN accounts a ON a.acc_id = p.acc_id
       ${where}
      ORDER BY ${order}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, { search, customerId, method, fromDate, toDate }) => {
  const conditions = ['p.deleted_at IS NULL'];
  const params = [];
  if (customerId) {
    conditions.push('p.customer_id = ?');
    params.push(customerId);
  }
  if (method) {
    conditions.push('p.payment_method = ?');
    params.push(method);
  }
  if (fromDate) {
    conditions.push('p.payment_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('p.payment_date <= ?');
    params.push(toDate);
  }
  if (search) {
    conditions.push('(p.payment_number LIKE ? OR c.customer_name LIKE ? OR p.reference_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  return run(
    conn,
    `SELECT COUNT(*) AS total FROM payments p JOIN customers c ON c.customer_id = p.customer_id WHERE ${conditions.join(' AND ')}`,
    params
  ).then((r) => r[0].total);
};

export const create = (conn, data) => {
  const { payment_number, customer_id, payment_date, payment_method, reference_number, amount, acc_id, notes, received_by } = data;
  return run(
    conn,
    `INSERT INTO payments (payment_number, customer_id, payment_date, payment_method, reference_number, amount, acc_id, notes, received_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [payment_number, customer_id, payment_date, payment_method, reference_number ?? null, amount, acc_id ?? null, notes ?? null, received_by]
  ).then((r) => r.insertId);
};

export const allocations = (conn, paymentId) =>
  run(
    conn,
    `SELECT pa.*, i.invoice_number, i.total_amount, i.paid_amount
       FROM payment_allocations pa
       JOIN invoices i ON i.invoice_id = pa.invoice_id
      WHERE pa.payment_id = ?
      ORDER BY pa.allocation_id`,
    [paymentId]
  );

export const addAllocation = (conn, paymentId, invoiceId, amount) =>
  run(
    conn,
    `INSERT INTO payment_allocations (payment_id, invoice_id, amount_allocated) VALUES (?, ?, ?)`,
    [paymentId, invoiceId, amount]
  );

export const updateAllocation = (conn, allocationId, amount) =>
  run(conn, `UPDATE payment_allocations SET amount_allocated = ? WHERE allocation_id = ?`, [amount, allocationId]);

export const attachments = (conn, paymentId) =>
  run(conn, `SELECT * FROM payment_attachments WHERE payment_id = ? ORDER BY uploaded_at DESC`, [paymentId]);

export const addAttachment = (conn, paymentId, { file_name, file_path, file_type }) =>
  run(
    conn,
    `INSERT INTO payment_attachments (payment_id, file_name, file_path, file_type) VALUES (?, ?, ?, ?)`,
    [paymentId, file_name, file_path, file_type]
  ).then((r) => r.insertId);

export const findAttachment = (conn, attachmentId) =>
  run(conn, `SELECT * FROM payment_attachments WHERE attachment_id = ?`, [attachmentId]).then((rows) => rows[0]);

export const deleteAttachment = (conn, attachmentId) =>
  run(conn, `DELETE FROM payment_attachments WHERE attachment_id = ?`, [attachmentId]);

export const update = (conn, id, data) => {
  const fields = [];
  const params = [];
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (!fields.length) return Promise.resolve();
  params.push(id);
  return run(conn, `UPDATE payments SET ${fields.join(', ')} WHERE payment_id = ? AND deleted_at IS NULL`, params);
};

export const softDelete = (conn, id, { reason, deletedBy } = {}) =>
  run(
    conn,
    `UPDATE payments SET deleted_at = NOW(), delete_reason = ?, deleted_by = ? WHERE payment_id = ?`,
    [reason ?? null, deletedBy ?? null, id]
  );

export const restore = (conn, id) =>
  run(conn, `UPDATE payments SET deleted_at = NULL, delete_reason = NULL, deleted_by = NULL WHERE payment_id = ?`, [id]);

export default {
  findById,
  findByIdIncludingDeleted,
  list,
  count,
  create,
  update,
  allocations,
  addAllocation,
  updateAllocation,
  attachments,
  addAttachment,
  findAttachment,
  deleteAttachment,
  softDelete,
  restore,
};
