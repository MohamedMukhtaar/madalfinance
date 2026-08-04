import run from './_base.js';

export const findById = (conn, id) =>
  run(conn, `SELECT * FROM customers WHERE customer_id = ? AND deleted_at IS NULL`, [id]).then(
    (rows) => rows[0]
  );

export const findByCode = (conn, code) =>
  run(conn, `SELECT * FROM customers WHERE customer_code = ? AND deleted_at IS NULL`, [code]).then(
    (rows) => rows[0]
  );

export const list = (conn, { search, status, offset, perPage, order }) => {
  const conditions = ['deleted_at IS NULL'];
  const params = [];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(customer_name LIKE ? OR company_name LIKE ? OR customer_code LIKE ? OR phone LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return run(
    conn,
    `SELECT c.*,
            (SELECT COUNT(*) FROM projects p WHERE p.customer_id = c.customer_id AND p.deleted_at IS NULL) AS project_count,
            (SELECT COALESCE(SUM(total_amount - paid_amount), 0) FROM invoices i
              WHERE i.customer_id = c.customer_id AND i.deleted_at IS NULL AND i.status IN ('Issued','Partial','Overdue')) AS outstanding_balance
       FROM customers c
       ${where}
      ORDER BY ${order}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, { search, status }) => {
  const conditions = ['deleted_at IS NULL'];
  const params = [];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(customer_name LIKE ? OR company_name LIKE ? OR customer_code LIKE ? OR phone LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  return run(conn, `SELECT COUNT(*) AS total FROM customers c WHERE ${conditions.join(' AND ')}`, params).then(
    (r) => r[0].total
  );
};

export const create = (conn, data) => {
  const { customer_code, customer_name, company_name, phone, email, address, city, notes, status } = data;
  return run(
    conn,
    `INSERT INTO customers (customer_code, customer_name, company_name, phone, email, address, city, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [customer_code, customer_name, company_name ?? null, phone ?? null, email ?? null, address ?? null, city ?? null, notes ?? null, status ?? 'active']
  ).then((r) => r.insertId);
};

export const update = (conn, id, data) => {
  const { customer_name, company_name, phone, email, address, city, notes, status } = data;
  return run(
    conn,
    `UPDATE customers SET
        customer_name = COALESCE(?, customer_name),
        company_name  = COALESCE(?, company_name),
        phone         = COALESCE(?, phone),
        email         = COALESCE(?, email),
        address       = COALESCE(?, address),
        city          = COALESCE(?, city),
        notes         = COALESCE(?, notes),
        status        = COALESCE(?, status)
      WHERE customer_id = ? AND deleted_at IS NULL`,
    [customer_name ?? null, company_name ?? null, phone ?? null, email ?? null, address ?? null, city ?? null, notes ?? null, status ?? null, id]
  );
};

export const softDelete = (conn, id, { reason, deletedBy } = {}) =>
  run(
    conn,
    `UPDATE customers SET deleted_at = NOW(), delete_reason = ?, deleted_by = ? WHERE customer_id = ?`,
    [reason ?? null, deletedBy ?? null, id]
  );

export const restore = (conn, id) =>
  run(
    conn,
    `UPDATE customers SET deleted_at = NULL, delete_reason = NULL, deleted_by = NULL WHERE customer_id = ?`,
    [id]
  );

export const contacts = (conn, customerId) =>
  run(conn, `SELECT * FROM customer_contacts WHERE customer_id = ?`, [customerId]);

export const addContact = (conn, customerId, data) =>
  run(
    conn,
    `INSERT INTO customer_contacts (customer_id, name, position, phone, email) VALUES (?, ?, ?, ?, ?)`,
    [customerId, data.name, data.position ?? null, data.phone ?? null, data.email ?? null]
  ).then((r) => r.insertId);

export const nextCode = (conn) =>
  run(conn, `SELECT CONCAT('CUST-', LPAD(COALESCE(MAX(customer_id), 0) + 1, 4, '0')) AS code FROM customers`).then(
    (r) => r[0].code
  );

export const statementInvoices = (conn, customerId) =>
  run(
    conn,
    `SELECT i.invoice_id, i.invoice_number, COALESCE(p.project_name, '') AS project_name,
            i.invoice_date, i.due_date, i.status,
            i.total_amount, i.paid_amount, (i.total_amount - i.paid_amount) AS balance
       FROM invoices i
       LEFT JOIN projects p ON p.project_id = i.project_id
      WHERE i.customer_id = ? AND i.deleted_at IS NULL
      ORDER BY i.invoice_date ASC`,
    [customerId]
  );

export const statementPayments = (conn, customerId) =>
  run(
    conn,
    `SELECT p.payment_id, p.payment_number, p.payment_date, p.amount, p.payment_method, p.reference_number,
            COALESCE(pa.invoice_number, '') AS invoice_number
       FROM payments p
       LEFT JOIN (
         SELECT a.payment_id, i.invoice_number
           FROM payment_allocations a JOIN invoices i ON i.invoice_id = a.invoice_id
       ) pa ON pa.payment_id = p.payment_id
      WHERE p.customer_id = ? AND p.deleted_at IS NULL
      ORDER BY p.payment_date ASC`,
    [customerId]
  );

export const transactionHistory = (conn, customerId) =>
  run(
    conn,
    `SELECT t.transaction_id, t.transaction_date, t.description, t.income, t.expense, t.balance_after
       FROM transactions t
      WHERE (t.reference_type = 'Invoice' AND t.reference_id IN (
              SELECT invoice_id FROM invoices WHERE customer_id = ?
            ))
         OR (t.reference_type = 'Payment' AND t.reference_id IN (
              SELECT payment_id FROM payments WHERE customer_id = ?
            ))
      ORDER BY t.transaction_date ASC`,
    [customerId, customerId]
  );

export default {
  findById,
  findByCode,
  list,
  count,
  create,
  update,
  softDelete,
  restore,
  contacts,
  addContact,
  nextCode,
  statementInvoices,
  statementPayments,
  transactionHistory,
};
