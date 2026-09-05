import run from './_base.js';

export const add = (conn, { entity_type, entity_id, entity_label, delete_reason, deleted_by }) =>
  run(
    conn,
    `INSERT INTO trash_bin (entity_type, entity_id, entity_label, delete_reason, deleted_by)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (entity_type, entity_id) DO UPDATE SET
       entity_label = EXCLUDED.entity_label,
       delete_reason = EXCLUDED.delete_reason,
       deleted_by = EXCLUDED.deleted_by,
       deleted_at = CURRENT_TIMESTAMP`,
    [entity_type, entity_id, entity_label, delete_reason, deleted_by ?? null]
  ).then((r) => r.insertId);

export const remove = (conn, entityType, entityId) =>
  run(conn, `DELETE FROM trash_bin WHERE entity_type = ? AND entity_id = ?`, [entityType, entityId]);

export const findById = (conn, trashId) =>
  run(conn, `SELECT * FROM trash_bin WHERE trash_id = ?`, [trashId]).then((rows) => rows[0]);

export const list = (conn, { search = '', entityType = '', offset = 0, perPage = 50 }) => {
  const conditions = [];
  const params = [];
  if (entityType) {
    conditions.push('t.entity_type = ?');
    params.push(entityType);
  }
  if (search) {
    conditions.push('(t.entity_label ILIKE ? OR t.delete_reason ILIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return run(
    conn,
    `SELECT t.*, u.full_name AS deleted_by_name
       FROM trash_bin t
       LEFT JOIN users u ON u.user_id = t.deleted_by
       ${where}
      ORDER BY t.deleted_at DESC
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, { search = '', entityType = '' }) => {
  const conditions = [];
  const params = [];
  if (entityType) {
    conditions.push('entity_type = ?');
    params.push(entityType);
  }
  if (search) {
    conditions.push('(entity_label ILIKE ? OR delete_reason ILIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return run(conn, `SELECT COUNT(*) AS total FROM trash_bin ${where}`, params).then((r) => r[0].total);
};

export default { add, remove, findById, list, count };
