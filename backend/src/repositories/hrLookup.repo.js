import run from './_base.js';

export const LOOKUPS = {
  departments: {
    table: 'departments',
    idCol: 'department_id',
    nameCol: 'department_name',
    employeeFk: 'department_id',
    extras: [],
  },
  titles: {
    table: 'job_titles',
    idCol: 'job_title_id',
    nameCol: 'title_name',
    employeeFk: 'job_title_id',
    extras: [],
  },
  branches: {
    table: 'branches',
    idCol: 'branch_id',
    nameCol: 'branch_name',
    employeeFk: 'branch_id',
    extras: [],
  },
  shifts: {
    table: 'shifts',
    idCol: 'shift_id',
    nameCol: 'shift_name',
    employeeFk: 'shift_id',
    extras: ['start_time', 'end_time'],
  },
};

export const lookupKinds = Object.keys(LOOKUPS);

export const getLookup = (kind) => LOOKUPS[kind] ?? null;

const extraSelect = (def) => (def.extras.length ? `, ${def.extras.map((c) => `t.${c}`).join(', ')}` : '');

export const list = (conn, kind) => {
  const def = LOOKUPS[kind];
  return run(
    conn,
    `SELECT t.${def.idCol}, t.${def.nameCol}${extraSelect(def)}, t.notes, t.status, t.created_at, t.updated_at,
            (SELECT COUNT(*) FROM employees e WHERE e.${def.employeeFk} = t.${def.idCol}) AS employee_count
       FROM ${def.table} t
      ORDER BY t.${def.nameCol} ASC`
  );
};

export const findById = (conn, kind, id) => {
  const def = LOOKUPS[kind];
  return run(
    conn,
    `SELECT t.${def.idCol}, t.${def.nameCol}${extraSelect(def)}, t.notes, t.status, t.created_at, t.updated_at
       FROM ${def.table} t
      WHERE t.${def.idCol} = ?`,
    [id]
  ).then((rows) => rows[0]);
};

export const findByName = (conn, kind, name) => {
  const def = LOOKUPS[kind];
  return run(conn, `SELECT * FROM ${def.table} WHERE LOWER(${def.nameCol}) = LOWER(?)`, [name]).then(
    (rows) => rows[0]
  );
};

export const create = async (conn, kind, data) => {
  const def = LOOKUPS[kind];
  if (kind === 'shifts') {
    return run(
      conn,
      `INSERT INTO shifts (shift_name, start_time, end_time, notes, status)
       VALUES (?, ?, ?, ?, ?)`,
      [data.name, data.start_time ?? null, data.end_time ?? null, data.notes ?? null, data.status ?? 'active']
    ).then((r) => r.insertId);
  }
  return run(
    conn,
    `INSERT INTO ${def.table} (${def.nameCol}, notes, status) VALUES (?, ?, ?)`,
    [data.name, data.notes ?? null, data.status ?? 'active']
  ).then((r) => r.insertId);
};

export const update = (conn, kind, id, data) => {
  const def = LOOKUPS[kind];
  if (kind === 'shifts') {
    return run(
      conn,
      `UPDATE shifts SET
          shift_name = COALESCE(?, shift_name),
          start_time = COALESCE(?, start_time),
          end_time   = COALESCE(?, end_time),
          notes      = COALESCE(?, notes),
          status     = COALESCE(?, status)
        WHERE shift_id = ?`,
      [data.name ?? null, data.start_time ?? null, data.end_time ?? null, data.notes ?? null, data.status ?? null, id]
    );
  }
  return run(
    conn,
    `UPDATE ${def.table} SET
        ${def.nameCol} = COALESCE(?, ${def.nameCol}),
        notes          = COALESCE(?, notes),
        status         = COALESCE(?, status)
      WHERE ${def.idCol} = ?`,
    [data.name ?? null, data.notes ?? null, data.status ?? null, id]
  );
};

export const syncEmployeeName = async (conn, kind, id, name) => {
  if (kind === 'departments') {
    return run(conn, `UPDATE employees SET department = ? WHERE department_id = ?`, [name, id]);
  }
  if (kind === 'titles') {
    await run(conn, `UPDATE employees SET job_title = ? WHERE job_title_id = ?`, [name, id]);
    return run(conn, `UPDATE members SET position = ? WHERE job_title_id = ?`, [name, id]);
  }
  return undefined;
};

export const countEmployees = (conn, kind, id) => {
  const def = LOOKUPS[kind];
  if (kind === 'titles') {
    return run(
      conn,
      `SELECT
         (SELECT COUNT(*) FROM employees WHERE job_title_id = ?)
         + (SELECT COUNT(*) FROM members WHERE job_title_id = ? AND deleted_at IS NULL) AS total`,
      [id, id]
    ).then((r) => r[0].total);
  }
  return run(conn, `SELECT COUNT(*) AS total FROM employees WHERE ${def.employeeFk} = ?`, [id]).then(
    (r) => r[0].total
  );
};

export const remove = (conn, kind, id) => {
  const def = LOOKUPS[kind];
  return run(conn, `DELETE FROM ${def.table} WHERE ${def.idCol} = ?`, [id]);
};

export default {
  LOOKUPS,
  lookupKinds,
  getLookup,
  list,
  findById,
  findByName,
  create,
  update,
  syncEmployeeName,
  countEmployees,
  remove,
};
