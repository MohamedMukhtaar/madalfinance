import run from './_base.js';

export const create = (conn, data) => {
  const { user_id, module, action, record_id, ip_address, device } = data;
  return run(
    conn,
    `INSERT INTO audit_logs (user_id, module, action, record_id, ip_address, device)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user_id ?? null, module, action, record_id ?? null, ip_address ?? null, device ?? null]
  );
};

export const list = (conn, { userId, module, action, fromDate, toDate, offset, perPage, order }) => {
  const conditions = [];
  const params = [];
  if (userId) {
    conditions.push('a.user_id = ?');
    params.push(userId);
  }
  if (module) {
    conditions.push('a.module = ?');
    params.push(module);
  }
  if (action) {
    conditions.push('a.action = ?');
    params.push(action);
  }
  if (fromDate) {
    conditions.push('a.created_at >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('a.created_at <= ?');
    params.push(toDate);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return run(
    conn,
    `SELECT a.*, u.username, u.full_name
       FROM audit_logs a LEFT JOIN users u ON u.user_id = a.user_id
       ${where}
      ORDER BY ${order}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, { userId, module, action, fromDate, toDate }) => {
  const conditions = [];
  const params = [];
  if (userId) {
    conditions.push('a.user_id = ?');
    params.push(userId);
  }
  if (module) {
    conditions.push('a.module = ?');
    params.push(module);
  }
  if (action) {
    conditions.push('a.action = ?');
    params.push(action);
  }
  if (fromDate) {
    conditions.push('a.created_at >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('a.created_at <= ?');
    params.push(toDate);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return run(conn, `SELECT COUNT(*) AS total FROM audit_logs a ${where}`, params).then((r) => r[0].total);
};

export default { create, list, count };
