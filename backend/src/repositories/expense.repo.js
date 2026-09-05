import run from './_base.js';
import { generateNumber } from '../helpers/numberGenerator.js';

const nextExpenseCode = async (conn) => {
  const rows = await run(conn, `SELECT COALESCE(MAX(expense_id), 0) AS max_id FROM expenses`);
  const next = Number(rows[0]?.max_id ?? 0) + 1;
  return `EXP-${String(next).padStart(4, '0')}`;
};

const paymentSelect = `
  SELECT ep.expense_payment_id AS expense_id,
         ep.*,
         ep.account_id AS acc_id,
         ep.payment_date AS expense_date,
         ep.paid_to AS paid_by,
         COALESCE(ep.notes, ec.description) AS description,
         e.expense_id AS expense_category_id,
         e.expense_name AS category_name,
         a.account_number AS account_number,
         a.account_name AS account_institution
    FROM expense_payments ep
    JOIN expense_charges ec ON ec.expense_charge_id = ep.expense_charge_id
    JOIN expenses e ON e.expense_id = ec.expense_id
    LEFT JOIN accounts a ON a.account_id = ep.account_id
`;

export const findById = (conn, id) =>
  run(
    conn,
    `${paymentSelect} WHERE ep.expense_payment_id = ? AND ep.deleted_at IS NULL`,
    [id]
  ).then((rows) => rows[0]);

export const findByIdIncludingDeleted = (conn, id) =>
  run(conn, `${paymentSelect} WHERE ep.expense_payment_id = ?`, [id]).then((rows) => rows[0]);

export const list = (conn, { search, categoryId, method, fromDate, toDate, offset, perPage, order }) => {
  const conditions = ['ep.deleted_at IS NULL'];
  const params = [];
  if (categoryId) {
    conditions.push('e.expense_id = ?');
    params.push(categoryId);
  }
  if (method) {
    conditions.push('ep.payment_method = ?');
    params.push(method);
  }
  if (fromDate) {
    conditions.push('ep.payment_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('ep.payment_date <= ?');
    params.push(toDate);
  }
  if (search) {
    conditions.push('(ec.description ILIKE ? OR ep.reference_number ILIKE ? OR e.expense_name ILIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const orderBy = String(order || 'expense_date DESC').replace(/\bexpense_date\b/g, 'ep.payment_date');
  return run(
    conn,
    `${paymentSelect}
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, { search, categoryId, method, fromDate, toDate }) => {
  const conditions = ['ep.deleted_at IS NULL'];
  const params = [];
  if (categoryId) {
    conditions.push('e.expense_id = ?');
    params.push(categoryId);
  }
  if (method) {
    conditions.push('ep.payment_method = ?');
    params.push(method);
  }
  if (fromDate) {
    conditions.push('ep.payment_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('ep.payment_date <= ?');
    params.push(toDate);
  }
  if (search) {
    conditions.push('(ec.description ILIKE ? OR ep.reference_number ILIKE ? OR e.expense_name ILIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  return run(
    conn,
    `SELECT COUNT(*) AS total
       FROM expense_payments ep
       JOIN expense_charges ec ON ec.expense_charge_id = ep.expense_charge_id
       JOIN expenses e ON e.expense_id = ec.expense_id
      WHERE ${conditions.join(' AND ')}`,
    params
  ).then((r) => r[0].total);
};

export const create = async (conn, data) => {
  const {
    expense_category_id, expense_date, description, amount, acc_id, paid_by, payment_method,
    reference_number, notes, created_by,
  } = data;

  const charge_number = await generateNumber(conn, 'expense_charges', 'charge_number', 'ECH-');
  const chargeId = await run(
    conn,
    `INSERT INTO expense_charges (charge_number, expense_id, charge_date, description, amount, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [charge_number, expense_category_id, expense_date, description ?? null, amount, created_by]
  ).then((r) => r.insertId);

  await run(conn, `UPDATE expense_charges SET paid_amount = ?, status = 'Paid' WHERE expense_charge_id = ?`, [
    amount,
    chargeId,
  ]);

  const payment_number = await generateNumber(conn, 'expense_payments', 'payment_number', 'EPY-');
  return run(
    conn,
    `INSERT INTO expense_payments
       (payment_number, expense_charge_id, account_id, payment_date, amount, payment_method,
        reference_number, paid_to, notes, paid_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payment_number,
      chargeId,
      acc_id,
      expense_date,
      amount,
      payment_method ?? 'Cash',
      reference_number ?? null,
      paid_by ?? null,
      notes ?? description ?? null,
      created_by,
    ]
  ).then((r) => r.insertId);
};

export const update = (conn, id, data) => {
  const { expense_date, description, amount, paid_by, payment_method, reference_number, notes } = data;
  return run(
    conn,
    `UPDATE expense_payments SET
        payment_date     = COALESCE(?, payment_date),
        amount           = COALESCE(?, amount),
        paid_to          = COALESCE(?, paid_to),
        payment_method   = COALESCE(?, payment_method),
        reference_number = COALESCE(?, reference_number),
        notes            = COALESCE(?, notes)
      WHERE expense_payment_id = ? AND deleted_at IS NULL`,
    [
      expense_date ?? null,
      amount ?? null,
      paid_by ?? null,
      payment_method ?? null,
      reference_number ?? null,
      notes ?? description ?? null,
      id,
    ]
  );
};

export const softDelete = (conn, id, { reason, deletedBy } = {}) =>
  run(
    conn,
    `UPDATE expense_payments SET deleted_at = NOW(), delete_reason = ?, deleted_by = ?, status = 'Cancelled'
      WHERE expense_payment_id = ?`,
    [reason ?? null, deletedBy ?? null, id]
  );

export const restore = (conn, id) =>
  run(
    conn,
    `UPDATE expense_payments SET deleted_at = NULL, delete_reason = NULL, deleted_by = NULL, status = 'Completed'
      WHERE expense_payment_id = ?`,
    [id]
  );

export const attachments = (conn, expenseId) =>
  run(
    conn,
    `SELECT a.* FROM expense_charge_attachments a
       JOIN expense_payments ep ON ep.expense_charge_id = a.expense_charge_id
      WHERE ep.expense_payment_id = ?
      ORDER BY a.uploaded_at DESC`,
    [expenseId]
  );

export const addAttachment = async (conn, expenseId, { file_name, file_path, file_type }) => {
  const payment = await findById(conn, expenseId);
  if (!payment) return null;
  return run(
    conn,
    `INSERT INTO expense_charge_attachments (expense_charge_id, file_name, file_path, file_type)
     VALUES (?, ?, ?, ?)`,
    [payment.expense_charge_id, file_name, file_path, file_type]
  ).then((r) => r.insertId);
};

export const findAttachment = (conn, attachmentId) =>
  run(conn, `SELECT * FROM expense_charge_attachments WHERE attachment_id = ?`, [attachmentId]).then(
    (rows) => rows[0]
  );

export const deleteAttachment = (conn, attachmentId) =>
  run(conn, `DELETE FROM expense_charge_attachments WHERE attachment_id = ?`, [attachmentId]);

export const findCategoryById = (conn, id) =>
  run(
    conn,
    `SELECT expense_id, expense_code, expense_name, status FROM expenses WHERE expense_id = ?`,
    [id]
  ).then((rows) => rows[0]);

export const categories = (conn) =>
  run(
    conn,
    `SELECT expense_id AS expense_category_id, expense_id AS id, expense_name AS category_name, expense_code
       FROM expenses
      WHERE status = 'active'
      ORDER BY expense_name`
  );

export const createCategory = async (conn, name) => {
  const expense_code = await nextExpenseCode(conn);
  return run(conn, `INSERT INTO expenses (expense_code, expense_name) VALUES (?, ?)`, [
    expense_code,
    name,
  ]).then((r) => r.insertId);
};

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
  findCategoryById,
  createCategory,
};
