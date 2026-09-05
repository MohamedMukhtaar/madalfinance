import run from './_base.js';
import { generateNumber } from '../helpers/numberGenerator.js';

const employeeCols = `
  e.employee_id, e.employee_code, e.first_name, e.last_name,
  TRIM(CONCAT(e.first_name, ' ', COALESCE(e.last_name, ''))) AS full_name,
  e.gender, e.phone, e.email, e.address,
  e.job_title_id, e.department_id, e.branch_id, e.shift_id,
  COALESCE(jt.title_name, e.job_title) AS job_title,
  COALESCE(d.department_name, e.department) AS department,
  b.branch_name AS branch,
  s.shift_name AS shift,
  s.start_time AS shift_start,
  s.end_time AS shift_end,
  e.hire_date, e.basic_salary, e.status, e.notes, e.created_at, e.updated_at
`;

const employeeJoins = `
       FROM employees e
  LEFT JOIN job_titles jt ON jt.job_title_id = e.job_title_id
  LEFT JOIN departments d ON d.department_id = e.department_id
  LEFT JOIN branches b ON b.branch_id = e.branch_id
  LEFT JOIN shifts s ON s.shift_id = e.shift_id
`;

export const list = (conn, { search, status, offset, perPage, order }) => {
  const conditions = ['TRUE'];
  const params = [];
  if (status) {
    conditions.push('e.status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push(
      `(e.first_name ILIKE ? OR e.last_name ILIKE ? OR e.phone ILIKE ? OR e.email ILIKE ?
        OR COALESCE(jt.title_name, e.job_title) ILIKE ?
        OR COALESCE(d.department_name, e.department) ILIKE ?
        OR b.branch_name ILIKE ? OR s.shift_name ILIKE ?
        OR e.employee_code ILIKE ?)`
    );
    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    );
  }
  return run(
    conn,
    `SELECT ${employeeCols}
      ${employeeJoins}
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${order}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, { search, status }) => {
  const conditions = ['TRUE'];
  const params = [];
  if (status) {
    conditions.push('e.status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push(
      `(e.first_name ILIKE ? OR e.last_name ILIKE ? OR e.phone ILIKE ? OR e.email ILIKE ?
        OR COALESCE(jt.title_name, e.job_title) ILIKE ?
        OR COALESCE(d.department_name, e.department) ILIKE ?
        OR b.branch_name ILIKE ? OR s.shift_name ILIKE ?
        OR e.employee_code ILIKE ?)`
    );
    params.push(
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`,
      `%${search}%`
    );
  }
  return run(
    conn,
    `SELECT COUNT(*) AS total
      ${employeeJoins}
      WHERE ${conditions.join(' AND ')}`,
    params
  ).then((r) => r[0].total);
};

export const findById = (conn, id) =>
  run(conn, `SELECT ${employeeCols} ${employeeJoins} WHERE e.employee_id = ?`, [id]).then((rows) => rows[0]);

export const listActive = (conn) =>
  run(
    conn,
    `SELECT ${employeeCols} ${employeeJoins} WHERE e.status = 'active' ORDER BY e.first_name, e.last_name`
  );

export const create = async (conn, data) => {
  const employee_code = data.employee_code || (await generateNumber(conn, 'employees', 'employee_code', 'EMP-', 4));
  return run(
    conn,
    `INSERT INTO employees
       (employee_code, first_name, last_name, gender, phone, email, address,
        job_title, department, job_title_id, department_id, branch_id, shift_id,
        hire_date, basic_salary, status, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      employee_code,
      data.first_name,
      data.last_name ?? null,
      data.gender ?? null,
      data.phone ?? null,
      data.email ?? null,
      data.address ?? null,
      data.job_title ?? null,
      data.department ?? null,
      data.job_title_id ?? null,
      data.department_id ?? null,
      data.branch_id ?? null,
      data.shift_id ?? null,
      data.hire_date,
      data.basic_salary ?? 0,
      data.status ?? 'active',
      data.notes ?? null,
      data.created_by,
    ]
  ).then((r) => r.insertId);
};

export const update = (conn, id, data) =>
  run(
    conn,
    `UPDATE employees SET
        first_name     = COALESCE(?, first_name),
        last_name      = COALESCE(?, last_name),
        gender         = COALESCE(?, gender),
        phone          = COALESCE(?, phone),
        email          = COALESCE(?, email),
        address        = COALESCE(?, address),
        job_title      = COALESCE(?, job_title),
        department     = COALESCE(?, department),
        job_title_id   = ?,
        department_id  = ?,
        branch_id      = ?,
        shift_id       = ?,
        hire_date      = COALESCE(?, hire_date),
        basic_salary   = COALESCE(?, basic_salary),
        status         = COALESCE(?, status),
        notes          = COALESCE(?, notes)
      WHERE employee_id = ?`,
    [
      data.first_name ?? null,
      data.last_name ?? null,
      data.gender ?? null,
      data.phone ?? null,
      data.email ?? null,
      data.address ?? null,
      data.job_title ?? null,
      data.department ?? null,
      data.job_title_id,
      data.department_id,
      data.branch_id,
      data.shift_id,
      data.hire_date ?? null,
      data.basic_salary ?? null,
      data.status ?? null,
      data.notes ?? null,
      id,
    ]
  );

export const setStatus = (conn, id, status) =>
  run(conn, `UPDATE employees SET status = ? WHERE employee_id = ?`, [status, id]);

export const countCharges = (conn, employeeId) =>
  run(conn, `SELECT COUNT(*) AS total FROM salary_charges WHERE employee_id = ?`, [employeeId]).then(
    (r) => r[0].total
  );

export const remove = (conn, id) => run(conn, `DELETE FROM employees WHERE employee_id = ?`, [id]);

export default {
  list,
  count,
  findById,
  listActive,
  create,
  update,
  setStatus,
  countCharges,
  remove,
};
