import run from './_base.js';

export const create = (conn, { kind, format, params, created_by }) =>
  run(
    conn,
    `INSERT INTO export_jobs (kind, format, params, created_by) VALUES (?, ?, ?, ?)`,
    [kind, format, JSON.stringify(params ?? {}), created_by]
  ).then((r) => r.insertId);

export const findById = (conn, id) =>
  run(conn, `SELECT * FROM export_jobs WHERE job_id = ?`, [id]).then((rows) => rows[0]);

export const markProcessing = (conn, id) =>
  run(conn, `UPDATE export_jobs SET status = 'processing' WHERE job_id = ?`, [id]);

export const markCompleted = (conn, id, filePath) =>
  run(
    conn,
    `UPDATE export_jobs SET status = 'completed', file_path = ?, completed_at = NOW() WHERE job_id = ?`,
    [filePath, id]
  );

export const markFailed = (conn, id, message) =>
  run(
    conn,
    `UPDATE export_jobs SET status = 'failed', error_message = ?, completed_at = NOW() WHERE job_id = ?`,
    [message, id]
  );

export default { create, findById, markProcessing, markCompleted, markFailed };
