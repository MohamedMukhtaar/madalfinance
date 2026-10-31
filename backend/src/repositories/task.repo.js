import run from './_base.js';

const TASK_COLS = `
  t.*,
  CASE
    WHEN t.assignee_type = 'employee' THEN TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')))
    WHEN t.assignee_type = 'member' THEN m.full_name
    ELSE NULL
  END AS assignee_name,
  e.employee_code,
  m.member_code,
  u.full_name AS created_by_name
`;

const JOINS = `
  FROM performance_tasks t
  LEFT JOIN employees e ON e.employee_id = t.employee_id
  LEFT JOIN members m ON m.member_id = t.member_id
  LEFT JOIN users u ON u.user_id = t.created_by
`;

export const findById = (conn, id) =>
  run(
    conn,
    `SELECT ${TASK_COLS} ${JOINS} WHERE t.task_id = ? AND t.deleted_at IS NULL`,
    [id]
  ).then((rows) => rows[0]);

const buildWhere = ({ search, status, priority, assigneeType, employeeId, memberId, fromDate, toDate }) => {
  const conditions = ['t.deleted_at IS NULL'];
  const params = [];
  if (status) {
    conditions.push('t.status = ?');
    params.push(status);
  }
  if (priority) {
    conditions.push('t.priority = ?');
    params.push(priority);
  }
  if (assigneeType) {
    conditions.push('t.assignee_type = ?');
    params.push(assigneeType);
  }
  if (employeeId) {
    conditions.push('t.employee_id = ?');
    params.push(employeeId);
  }
  if (memberId) {
    conditions.push('t.member_id = ?');
    params.push(memberId);
  }
  if (fromDate) {
    conditions.push('t.due_date IS NOT NULL AND t.due_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('t.due_date IS NOT NULL AND t.due_date <= ?');
    params.push(toDate);
  }
  if (search) {
    conditions.push(
      `(t.title ILIKE ? OR t.description ILIKE ? OR e.first_name ILIKE ? OR e.last_name ILIKE ? OR m.full_name ILIKE ?)`
    );
    const q = `%${search}%`;
    params.push(q, q, q, q, q);
  }
  return { where: `WHERE ${conditions.join(' AND ')}`, params };
};

export const list = (conn, filters) => {
  const { offset, perPage, order, ...rest } = filters;
  const { where, params } = buildWhere(rest);
  const qualifiedOrder = String(order || 'due_date ASC NULLS LAST, created_at DESC').replace(
    /^([A-Za-z_]+)/,
    't.$1'
  );
  return run(
    conn,
    `SELECT ${TASK_COLS} ${JOINS} ${where} ORDER BY ${qualifiedOrder} LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, filters) => {
  const { where, params } = buildWhere(filters);
  return run(conn, `SELECT COUNT(*) AS total ${JOINS} ${where}`, params).then((r) => r[0].total);
};

export const stats = (conn) =>
  run(
    conn,
    `SELECT
        COUNT(*) FILTER (WHERE status = 'Todo' AND deleted_at IS NULL) AS todo,
        COUNT(*) FILTER (WHERE status = 'In Progress' AND deleted_at IS NULL) AS in_progress,
        COUNT(*) FILTER (WHERE status = 'Done' AND deleted_at IS NULL) AS done,
        COUNT(*) FILTER (
          WHERE status IN ('Todo', 'In Progress')
            AND due_date IS NOT NULL
            AND due_date < CURRENT_DATE
            AND deleted_at IS NULL
        ) AS overdue
       FROM performance_tasks`
  ).then((r) => r[0]);

export const create = (conn, data) =>
  run(
    conn,
    `INSERT INTO performance_tasks
      (title, description, priority, status, due_date, assignee_type, employee_id, member_id, created_by, notes, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.description ?? null,
      data.priority ?? 'Medium',
      data.status ?? 'Todo',
      data.due_date ?? null,
      data.assignee_type,
      data.employee_id ?? null,
      data.member_id ?? null,
      data.created_by,
      data.notes ?? null,
      data.status === 'Done' ? new Date() : null,
    ]
  ).then((r) => r.insertId);

export const update = (conn, id, data) => {
  const sets = [];
  const params = [];

  if (data.title !== undefined) {
    sets.push('title = ?');
    params.push(data.title);
  }
  if (data.description !== undefined) {
    sets.push('description = ?');
    params.push(data.description);
  }
  if (data.priority !== undefined) {
    sets.push('priority = ?');
    params.push(data.priority);
  }
  if (data.status !== undefined) {
    sets.push('status = ?');
    params.push(data.status);
    sets.push(`completed_at = CASE
      WHEN ? = 'Done' AND (status IS DISTINCT FROM 'Done') THEN NOW()
      WHEN ? <> 'Done' THEN NULL
      ELSE completed_at
    END`);
    params.push(data.status, data.status);
  }
  if (data.due_date !== undefined) {
    sets.push('due_date = ?');
    params.push(data.due_date);
  }
  if (data.assignee_type !== undefined) {
    sets.push('assignee_type = ?', 'employee_id = ?', 'member_id = ?');
    params.push(data.assignee_type, data.employee_id ?? null, data.member_id ?? null);
  }
  if (data.notes !== undefined) {
    sets.push('notes = ?');
    params.push(data.notes);
  }

  if (!sets.length) return Promise.resolve();
  sets.push('updated_at = NOW()');
  params.push(id);
  return run(conn, `UPDATE performance_tasks SET ${sets.join(', ')} WHERE task_id = ? AND deleted_at IS NULL`, params);
};

export const softDelete = (conn, id) =>
  run(conn, `UPDATE performance_tasks SET deleted_at = NOW(), updated_at = NOW() WHERE task_id = ? AND deleted_at IS NULL`, [
    id,
  ]);

export default { findById, list, count, stats, create, update, softDelete };
