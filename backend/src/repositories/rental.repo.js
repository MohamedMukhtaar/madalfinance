import run from './_base.js';

export const findById = (conn, id) =>
  run(conn, `SELECT * FROM rental_billings WHERE billing_id = ?`, [id]).then((rows) => rows[0]);

export const findByProject = (conn, projectId) =>
  run(conn, `SELECT * FROM rental_billings WHERE project_id = ?`, [projectId]).then((rows) => rows[0]);

export const list = (conn, { status, offset, perPage, order }) => {
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('rb.status = ?');
    params.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return run(
    conn,
    `SELECT rb.*, p.project_name, p.customer_id, c.customer_name
       FROM rental_billings rb
       JOIN projects p ON p.project_id = rb.project_id
       JOIN customers c ON c.customer_id = p.customer_id
       ${where}
      ORDER BY ${order}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, { status }) => {
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('rb.status = ?');
    params.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return run(conn, `SELECT COUNT(*) AS total FROM rental_billings rb ${where}`, params).then(
    (r) => r[0].total
  );
};

export const create = (conn, data) => {
  const { project_id, monthly_amount, billing_day, next_billing_date, status } = data;
  return run(
    conn,
    `INSERT INTO rental_billings (project_id, monthly_amount, billing_day, next_billing_date, status)
     VALUES (?, ?, ?, ?, ?)`,
    [project_id, monthly_amount, billing_day, next_billing_date ?? null, status ?? 'Active']
  ).then((r) => r.insertId);
};

export const update = (conn, id, data) => {
  const { monthly_amount, billing_day, next_billing_date, status } = data;
  return run(
    conn,
    `UPDATE rental_billings SET
        monthly_amount    = COALESCE(?, monthly_amount),
        billing_day       = COALESCE(?, billing_day),
        next_billing_date = COALESCE(?, next_billing_date),
        status            = COALESCE(?, status)
      WHERE billing_id = ?`,
    [monthly_amount ?? null, billing_day ?? null, next_billing_date ?? null, status ?? null, id]
  );
};

export const setStatus = (conn, id, status) =>
  run(conn, `UPDATE rental_billings SET status = ? WHERE billing_id = ?`, [status, id]);

/** Advance the billing schedule after an invoice was generated. */
export const advanceBilling = (conn, id, { next_billing_date, last_generated }) =>
  run(conn, `UPDATE rental_billings SET next_billing_date = ?, last_generated = ? WHERE billing_id = ?`, [
    next_billing_date,
    last_generated,
    id,
  ]);

/** Billings due on or before today (used by the daily job). */
export const dueForBilling = (conn, today) =>
  run(
    conn,
    `SELECT rb.*, p.project_id, p.project_name, p.customer_id, c.customer_name
       FROM rental_billings rb
       JOIN projects p ON p.project_id = rb.project_id
       JOIN customers c ON c.customer_id = p.customer_id
      WHERE rb.status = 'Active'
        AND rb.next_billing_date IS NOT NULL
        AND rb.next_billing_date <= ?`,
    [today]
  );

export default { findById, findByProject, list, count, create, update, setStatus, advanceBilling, dueForBilling };
