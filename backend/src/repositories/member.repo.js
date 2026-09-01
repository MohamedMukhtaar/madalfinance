import run from './_base.js';

const memberCols = `
  m.member_id, m.full_name AS member_name, m.phone, m.email,
  m.joined_date, m.default_monthly_due, m.position, m.credit_balance,
  m.avatar_path, m.avatar_name, m.status, m.created_at
`;

export const listMembers = (conn, { search, status, offset, perPage, order }) => {
  const conditions = ['m.deleted_at IS NULL'];
  const params = [];
  if (status) {
    conditions.push('m.status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(m.full_name LIKE ? OR m.email LIKE ? OR m.phone LIKE ? OR m.position LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return run(
    conn,
    `SELECT ${memberCols}
       FROM members m
       ${where}
      ORDER BY ${order}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const countMembers = (conn, { search, status }) => {
  const conditions = ['m.deleted_at IS NULL'];
  const params = [];
  if (status) {
    conditions.push('m.status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(m.full_name LIKE ? OR m.email LIKE ? OR m.phone LIKE ? OR m.position LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return run(conn, `SELECT COUNT(*) AS total FROM members m ${where}`, params).then((r) => r[0].total);
};

export const findMemberById = (conn, id) =>
  run(
    conn,
    `SELECT ${memberCols}
       FROM members m
      WHERE m.member_id = ? AND m.deleted_at IS NULL`,
    [id]
  ).then((rows) => rows[0]);

export const findMemberByIdIncludingDeleted = (conn, id) =>
  run(
    conn,
    `SELECT ${memberCols}
       FROM members m
      WHERE m.member_id = ?`,
    [id]
  ).then((rows) => rows[0]);

export const softDelete = (conn, id, { reason, deletedBy } = {}) =>
  run(
    conn,
    `UPDATE members SET deleted_at = NOW(), delete_reason = ?, deleted_by = ?, status = 'inactive' WHERE member_id = ?`,
    [reason ?? null, deletedBy ?? null, id]
  );

export const restore = (conn, id) =>
  run(
    conn,
    `UPDATE members SET deleted_at = NULL, delete_reason = NULL, deleted_by = NULL, status = 'active' WHERE member_id = ?`,
    [id]
  );

export const createMember = (conn, data) =>
  run(
    conn,
    `INSERT INTO members (full_name, phone, email, joined_date, default_monthly_due, position, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.full_name,
      data.phone ?? null,
      data.email ?? null,
      data.joined_date,
      data.default_monthly_due ?? 10,
      data.position ?? null,
      data.status ?? 'active',
    ]
  ).then((r) => r.insertId);

export const updateMember = (conn, id, data) =>
  run(
    conn,
    `UPDATE members SET
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        position = COALESCE(?, position),
        default_monthly_due = COALESCE(?, default_monthly_due),
        status = COALESCE(?, status),
        joined_date = COALESCE(?, joined_date),
        avatar_path = COALESCE(?, avatar_path),
        avatar_name = COALESCE(?, avatar_name)
      WHERE member_id = ?`,
    [
      data.full_name ?? null,
      data.phone ?? null,
      data.email ?? null,
      data.position ?? null,
      data.default_monthly_due ?? null,
      data.status ?? null,
      data.joined_date ?? null,
      data.avatar_path ?? null,
      data.avatar_name ?? null,
      id,
    ]
  );

export const saveAvatar = (conn, id, { avatar_path, avatar_name }) =>
  run(conn, `UPDATE members SET avatar_path = ?, avatar_name = ? WHERE member_id = ?`, [
    avatar_path,
    avatar_name,
    id,
  ]);

export const listPublicTeam = (conn) =>
  run(
    conn,
    `SELECT m.member_id, m.full_name AS member_name, m.position, m.avatar_path, m.avatar_name
       FROM members m
      WHERE m.status = 'active' AND m.deleted_at IS NULL
      ORDER BY m.member_id ASC
      LIMIT 12`
  );

export default {
  listMembers,
  countMembers,
  findMemberById,
  findMemberByIdIncludingDeleted,
  createMember,
  updateMember,
  softDelete,
  restore,
  saveAvatar,
  listPublicTeam,
};
