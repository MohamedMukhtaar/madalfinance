import run from './_base.js';

const memberCols = `
  m.member_id, m.member_code, m.full_name AS member_name, m.phone, m.email,
  m.address, m.joined_date, m.default_monthly_due, m.job_title_id,
  COALESCE(jt.title_name, m.position) AS position, m.credit_balance,
  m.ownership_percentage, m.avatar_path, m.avatar_name, m.status, m.created_at
`;

const memberJoin = `
       FROM members m
  LEFT JOIN job_titles jt ON jt.job_title_id = m.job_title_id
`;

const nextMemberCode = async (conn) => {
  const rows = await run(conn, `SELECT COALESCE(MAX(member_id), 0) AS max_id FROM members`);
  const next = Number(rows[0]?.max_id ?? 0) + 1;
  return `MEM-${String(next).padStart(4, '0')}`;
};

export const listMembers = (conn, { search, status, offset, perPage, order }) => {
  const conditions = ['m.deleted_at IS NULL'];
  const params = [];
  if (status) {
    conditions.push('m.status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push(
      `(m.full_name ILIKE ? OR m.email ILIKE ? OR m.phone ILIKE ?
        OR COALESCE(jt.title_name, m.position) ILIKE ? OR m.member_code ILIKE ?)`
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return run(
    conn,
    `SELECT ${memberCols}
      ${memberJoin}
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
    conditions.push(
      `(m.full_name ILIKE ? OR m.email ILIKE ? OR m.phone ILIKE ?
        OR COALESCE(jt.title_name, m.position) ILIKE ? OR m.member_code ILIKE ?)`
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return run(conn, `SELECT COUNT(*) AS total ${memberJoin} ${where}`, params).then((r) => r[0].total);
};

export const findMemberById = (conn, id) =>
  run(
    conn,
    `SELECT ${memberCols}
      ${memberJoin}
      WHERE m.member_id = ? AND m.deleted_at IS NULL`,
    [id]
  ).then((rows) => rows[0]);

export const findMemberByIdIncludingDeleted = (conn, id) =>
  run(
    conn,
    `SELECT ${memberCols}
      ${memberJoin}
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

export const createMember = async (conn, data) => {
  const member_code = data.member_code || (await nextMemberCode(conn));
  return run(
    conn,
    `INSERT INTO members (member_code, full_name, phone, email, address, joined_date, default_monthly_due, position, job_title_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      member_code,
      data.full_name,
      data.phone ?? null,
      data.email ?? null,
      data.address ?? null,
      data.joined_date,
      data.default_monthly_due ?? 10,
      data.position ?? null,
      data.job_title_id ?? null,
      data.status ?? 'active',
    ]
  ).then((r) => r.insertId);
};

export const updateMember = (conn, id, data) =>
  run(
    conn,
    `UPDATE members SET
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        position = COALESCE(?, position),
        job_title_id = ?,
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
      data.job_title_id,
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
    `SELECT m.member_id, m.full_name AS member_name, COALESCE(jt.title_name, m.position) AS position,
            m.avatar_path, m.avatar_name
       FROM members m
  LEFT JOIN job_titles jt ON jt.job_title_id = m.job_title_id
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
