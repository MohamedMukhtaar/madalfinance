import run from './_base.js';
import { generateNumber } from '../helpers/numberGenerator.js';

const chargeCols = `
  sc.salary_charge_id, sc.charge_number, sc.employee_id, sc.charge_date, sc.salary_period,
  sc.basic_salary, sc.allowance, sc.deduction, sc.net_salary, sc.paid_amount, sc.balance,
  sc.status, sc.reference_number, sc.notes, sc.created_at,
  TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS full_name,
  e.employee_code, e.job_title, e.department
`;

const paymentCols = `
  sp.salary_payment_id, sp.payment_number, sp.salary_charge_id, sp.employee_id,
  sp.account_id, sp.account_id AS acc_id, sp.payment_date, sp.amount, sp.payment_method,
  sp.reference_number, sp.notes, sp.status, sp.created_at, sp.paid_by,
  TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS full_name,
  e.employee_code, sc.charge_number, sc.salary_period,
  a.account_name AS institution, a.account_number AS number
`;

export const listCharges = (conn, { search, status, employeeId, period, offset, perPage, order }) => {
  const conditions = ['TRUE'];
  const params = [];
  if (status) {
    conditions.push('sc.status = ?');
    params.push(status);
  }
  if (employeeId) {
    conditions.push('sc.employee_id = ?');
    params.push(employeeId);
  }
  if (period) {
    conditions.push('sc.salary_period = ?');
    params.push(period);
  }
  if (search) {
    conditions.push(
      `(e.first_name ILIKE ? OR e.last_name ILIKE ? OR sc.charge_number ILIKE ? OR e.employee_code ILIKE ?)`
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const orderBy = String(order || 'sc.salary_period DESC').replace(/\bsalary_period\b/g, 'sc.salary_period');
  return run(
    conn,
    `SELECT ${chargeCols}
       FROM salary_charges sc
       JOIN employees e ON e.employee_id = sc.employee_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const countCharges = (conn, { search, status, employeeId, period }) => {
  const conditions = ['TRUE'];
  const params = [];
  if (status) {
    conditions.push('sc.status = ?');
    params.push(status);
  }
  if (employeeId) {
    conditions.push('sc.employee_id = ?');
    params.push(employeeId);
  }
  if (period) {
    conditions.push('sc.salary_period = ?');
    params.push(period);
  }
  if (search) {
    conditions.push(
      `(e.first_name ILIKE ? OR e.last_name ILIKE ? OR sc.charge_number ILIKE ? OR e.employee_code ILIKE ?)`
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  return run(
    conn,
    `SELECT COUNT(*) AS total
       FROM salary_charges sc
       JOIN employees e ON e.employee_id = sc.employee_id
      WHERE ${conditions.join(' AND ')}`,
    params
  ).then((r) => r[0].total);
};

export const findChargeById = (conn, id) =>
  run(
    conn,
    `SELECT ${chargeCols}
       FROM salary_charges sc
       JOIN employees e ON e.employee_id = sc.employee_id
      WHERE sc.salary_charge_id = ?`,
    [id]
  ).then((rows) => rows[0]);

export const findChargeByEmployeePeriod = (conn, employeeId, period) =>
  run(
    conn,
    `SELECT ${chargeCols}
       FROM salary_charges sc
       JOIN employees e ON e.employee_id = sc.employee_id
      WHERE sc.employee_id = ? AND sc.salary_period = ?`,
    [employeeId, period]
  ).then((rows) => rows[0]);

export const createCharge = async (conn, data) => {
  const charge_number = await generateNumber(conn, 'salary_charges', 'charge_number', 'SCH-', 6);
  return run(
    conn,
    `INSERT INTO salary_charges
       (charge_number, employee_id, charge_date, salary_period, basic_salary,
        allowance, deduction, reference_number, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      charge_number,
      data.employee_id,
      data.charge_date,
      data.salary_period,
      data.basic_salary ?? 0,
      data.allowance ?? 0,
      data.deduction ?? 0,
      data.reference_number ?? null,
      data.notes ?? null,
      data.created_by,
    ]
  ).then((r) => r.insertId);
};

export const applyChargePayment = (conn, id, paidAmount, status) =>
  run(conn, `UPDATE salary_charges SET paid_amount = ?, status = ? WHERE salary_charge_id = ?`, [
    paidAmount,
    status,
    id,
  ]);

export const cancelCharge = (conn, id) =>
  run(conn, `UPDATE salary_charges SET status = 'Cancelled' WHERE salary_charge_id = ? AND paid_amount = 0`, [id]);

export const deleteCharge = (conn, id) =>
  run(conn, `DELETE FROM salary_charges WHERE salary_charge_id = ? AND paid_amount = 0`, [id]);

export const listPayments = (conn, { search, employeeId, fromDate, toDate, offset, perPage, order }) => {
  const conditions = [`sp.status = 'Completed'`];
  const params = [];
  if (employeeId) {
    conditions.push('sp.employee_id = ?');
    params.push(employeeId);
  }
  if (fromDate) {
    conditions.push('sp.payment_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('sp.payment_date < (?::date + INTERVAL \'1 day\')');
    params.push(toDate);
  }
  if (search) {
    conditions.push(
      `(e.first_name ILIKE ? OR e.last_name ILIKE ? OR sp.payment_number ILIKE ? OR sp.reference_number ILIKE ?)`
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const orderBy = String(order || 'sp.payment_date DESC').replace(/\bpayment_date\b/g, 'sp.payment_date');
  return run(
    conn,
    `SELECT ${paymentCols}
       FROM salary_payments sp
       JOIN employees e ON e.employee_id = sp.employee_id
       JOIN salary_charges sc ON sc.salary_charge_id = sp.salary_charge_id
       LEFT JOIN accounts a ON a.account_id = sp.account_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const countPayments = (conn, { search, employeeId, fromDate, toDate }) => {
  const conditions = [`sp.status = 'Completed'`];
  const params = [];
  if (employeeId) {
    conditions.push('sp.employee_id = ?');
    params.push(employeeId);
  }
  if (fromDate) {
    conditions.push('sp.payment_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('sp.payment_date < (?::date + INTERVAL \'1 day\')');
    params.push(toDate);
  }
  if (search) {
    conditions.push(
      `(e.first_name ILIKE ? OR e.last_name ILIKE ? OR sp.payment_number ILIKE ? OR sp.reference_number ILIKE ?)`
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  return run(
    conn,
    `SELECT COUNT(*) AS total
       FROM salary_payments sp
       JOIN employees e ON e.employee_id = sp.employee_id
      WHERE ${conditions.join(' AND ')}`,
    params
  ).then((r) => r[0].total);
};

export const findPaymentById = (conn, id) =>
  run(
    conn,
    `SELECT ${paymentCols}
       FROM salary_payments sp
       JOIN employees e ON e.employee_id = sp.employee_id
       JOIN salary_charges sc ON sc.salary_charge_id = sp.salary_charge_id
       LEFT JOIN accounts a ON a.account_id = sp.account_id
      WHERE sp.salary_payment_id = ?`,
    [id]
  ).then((rows) => rows[0]);

export const createPayment = async (conn, data) => {
  const payment_number = await generateNumber(conn, 'salary_payments', 'payment_number', 'SPY-', 6);
  return run(
    conn,
    `INSERT INTO salary_payments
       (payment_number, salary_charge_id, employee_id, account_id, payment_date,
        amount, payment_method, reference_number, notes, paid_by, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completed')`,
    [
      payment_number,
      data.salary_charge_id,
      data.employee_id,
      data.account_id,
      data.payment_date,
      data.amount,
      data.payment_method ?? 'Cash',
      data.reference_number ?? null,
      data.notes ?? null,
      data.paid_by,
    ]
  ).then((r) => r.insertId);
};

export default {
  listCharges,
  countCharges,
  findChargeById,
  findChargeByEmployeePeriod,
  createCharge,
  applyChargePayment,
  cancelCharge,
  deleteCharge,
  listPayments,
  countPayments,
  findPaymentById,
  createPayment,
};
