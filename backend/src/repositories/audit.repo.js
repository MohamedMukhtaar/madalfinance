import run from './_base.js';

const ORDER_MAP = {
  log_id: 'a.log_id',
  created_at: 'a.created_at',
  module: 'a.module',
  action: 'a.action',
  username: 'u.username',
};

const resolveOrder = (order) => {
  const [col, dirRaw] = String(order || 'log_id desc').split(/\s+/);
  const sortCol = ORDER_MAP[col] || 'a.log_id';
  const sortDir = dirRaw && dirRaw.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  return `${sortCol} ${sortDir}`;
};

export const create = (conn, data) => {
  const { user_id, module, action, record_id, ip_address, device, details } = data;
  return run(
    conn,
    `INSERT INTO audit_logs (user_id, module, action, record_id, ip_address, device, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user_id ?? null, module, action, record_id ?? null, ip_address ?? null, device ?? null, details ?? null]
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
    params.push(`${toDate} 23:59:59`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy = resolveOrder(order);
  return run(
    conn,
    `SELECT a.log_id, a.user_id, a.module, a.action, a.record_id, a.ip_address, a.device, a.details, a.created_at,
            u.username, u.full_name
       FROM audit_logs a
       LEFT JOIN users u ON u.user_id = a.user_id
       ${where}
      ORDER BY ${orderBy}
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
    params.push(`${toDate} 23:59:59`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return run(conn, `SELECT COUNT(*) AS total FROM audit_logs a ${where}`, params).then((r) => r[0].total);
};

export default { create, list, count };
