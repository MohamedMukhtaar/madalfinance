import run from './_base.js';

export const findBatch = (conn, batchId) =>
  run(conn, `SELECT * FROM member_due_batches WHERE batch_id = ?`, [batchId]).then((rows) => rows[0]);

export const findBatchByMonth = (conn, month, year) =>
  run(conn, `SELECT * FROM member_due_batches WHERE month = ? AND year = ?`, [month, year]).then(
    (rows) => rows[0]
  );

export const listBatches = (conn, { offset, perPage, order }) =>
  run(
    conn,
    `SELECT b.*, u.full_name AS generated_by_name,
            (SELECT COUNT(*) FROM member_dues d WHERE d.batch_id = b.batch_id) AS total_dues,
            (SELECT COALESCE(SUM(d.amount), 0) FROM member_dues d WHERE d.batch_id = b.batch_id) AS expected_amount,
            (SELECT COALESCE(SUM(d.paid_amount), 0) FROM member_dues d WHERE d.batch_id = b.batch_id) AS collected_amount
       FROM member_due_batches b
       JOIN users u ON u.user_id = b.generated_by
      ORDER BY ${order}
      LIMIT ? OFFSET ?`,
    [perPage, offset]
  );

export const countBatches = (conn) =>
  run(conn, `SELECT COUNT(*) AS total FROM member_due_batches`).then((r) => r[0].total);

export const createBatch = (conn, { month, year, default_amount, generated_date, generated_by }) =>
  run(
    conn,
    `INSERT INTO member_due_batches (month, year, default_amount, generated_date, generated_by)
     VALUES (?, ?, ?, ?, ?)`,
    [month, year, default_amount, generated_date, generated_by]
  ).then((r) => r.insertId);

export const createDue = (conn, { batch_id, member_id, amount }) =>
  run(conn, `INSERT INTO member_dues (batch_id, member_id, amount) VALUES (?, ?, ?)`, [
    batch_id,
    member_id,
    amount,
  ]);

export const dueById = (conn, dueId) =>
  run(conn, `SELECT * FROM member_dues WHERE due_id = ?`, [dueId]).then((rows) => rows[0]);

export const listDues = (conn, { batchId, status, memberId, offset, perPage, order }) => {
  const conditions = [];
  const params = [];
  if (batchId) {
    conditions.push('d.batch_id = ?');
    params.push(batchId);
  }
  if (status) {
    conditions.push('d.status = ?');
    params.push(status);
  }
  if (memberId) {
    conditions.push('d.member_id = ?');
    params.push(memberId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return run(
    conn,
    `SELECT d.*, m.position, u.full_name AS member_name,
            (SELECT COUNT(*) FROM member_due_attachments a WHERE a.due_id = d.due_id) AS attachment_count
       FROM member_dues d
       JOIN members m ON m.member_id = d.member_id
       JOIN users u ON u.user_id = m.user_id
       ${where}
      ORDER BY ${order}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const countDues = (conn, { batchId, status, memberId }) => {
  const conditions = [];
  const params = [];
  if (batchId) {
    conditions.push('d.batch_id = ?');
    params.push(batchId);
  }
  if (status) {
    conditions.push('d.status = ?');
    params.push(status);
  }
  if (memberId) {
    conditions.push('d.member_id = ?');
    params.push(memberId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return run(conn, `SELECT COUNT(*) AS total FROM member_dues d ${where}`, params).then((r) => r[0].total);
};

export const applyDuePayment = (conn, dueId, paidAmount, status, paidDate) =>
  run(conn, `UPDATE member_dues SET paid_amount = ?, status = ?, paid_date = ? WHERE due_id = ?`, [
    paidAmount,
    status,
    paidDate ?? null,
    dueId,
  ]);

export const activeMembers = (conn) =>
  run(
    conn,
    `SELECT m.*, u.full_name AS member_name, u.user_id, u.email
       FROM members m JOIN users u ON u.user_id = m.user_id
      WHERE m.status = 'active'`
  );

export const attachments = (conn, dueId) =>
  run(
    conn,
    `SELECT * FROM member_due_attachments WHERE due_id = ? ORDER BY uploaded_at DESC`,
    [dueId]
  );

export const addAttachment = (conn, dueId, { file_name, file_path, file_type, uploaded_by }) =>
  run(
    conn,
    `INSERT INTO member_due_attachments (due_id, file_name, file_path, file_type, uploaded_by)
     VALUES (?, ?, ?, ?, ?)`,
    [dueId, file_name, file_path, file_type, uploaded_by ?? null]
  ).then((r) => r.insertId);

export const findAttachment = (conn, attachmentId) =>
  run(conn, `SELECT * FROM member_due_attachments WHERE attachment_id = ?`, [attachmentId]).then(
    (rows) => rows[0]
  );

export const deleteAttachment = (conn, attachmentId) =>
  run(conn, `DELETE FROM member_due_attachments WHERE attachment_id = ?`, [attachmentId]);

export default {
  findBatch,
  findBatchByMonth,
  listBatches,
  countBatches,
  createBatch,
  createDue,
  dueById,
  listDues,
  countDues,
  applyDuePayment,
  activeMembers,
  attachments,
  addAttachment,
  findAttachment,
  deleteAttachment,
};
