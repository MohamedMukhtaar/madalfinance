import run from './_base.js';
import { generateNumber } from '../helpers/numberGenerator.js';

export const findBatch = (conn, batchId) =>
  run(
    conn,
    `SELECT b.*, b.generated_at AS generated_date FROM member_due_batches b WHERE b.batch_id = ?`,
    [batchId]
  ).then((rows) => rows[0]);

export const findBatchByMonth = (conn, month, year) =>
  run(conn, `SELECT *, generated_at AS generated_date FROM member_due_batches WHERE month = ? AND year = ?`, [
    month,
    year,
  ]).then((rows) => rows[0]);

export const listBatches = (conn, { offset, perPage, order }) =>
  run(
    conn,
    `SELECT b.*, b.generated_at AS generated_date, u.full_name AS generated_by_name,
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
    `INSERT INTO member_due_batches (month, year, default_amount, generated_at, generated_by)
     VALUES (?, ?, ?, ?, ?)`,
    [month, year, default_amount, generated_date ?? new Date(), generated_by]
  ).then((r) => r.insertId);

export const createDue = (conn, { batch_id, member_id, amount }) =>
  run(conn, `INSERT INTO member_dues (batch_id, member_id, amount) VALUES (?, ?, ?)`, [
    batch_id,
    member_id,
    amount,
  ]);

export const dueById = (conn, dueId) =>
  run(
    conn,
    `SELECT d.*, b.month, b.year, m.full_name AS member_name
       FROM member_dues d
       JOIN member_due_batches b ON b.batch_id = d.batch_id
       JOIN members m ON m.member_id = d.member_id
      WHERE d.due_id = ?`,
    [dueId]
  ).then((rows) => rows[0]);

export const createDuePayment = async (conn, { due_id, amount, acc_id, paid_date, created_by, member_id }) => {
  let resolvedMemberId = member_id;
  if (!resolvedMemberId) {
    const due = await dueById(conn, due_id);
    resolvedMemberId = due?.member_id;
  }
  return run(
    conn,
    `INSERT INTO member_due_payments
       (due_id, member_id, account_id, amount, paid_at, received_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [due_id, resolvedMemberId, acc_id, amount, paid_date ?? new Date(), created_by]
  ).then((r) => r.insertId);
};

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
    `SELECT d.*, d.paid_at AS paid_date, m.position, m.credit_balance, m.full_name AS member_name,
            (SELECT COUNT(*) FROM member_due_attachments a WHERE a.due_id = d.due_id) AS attachment_count
       FROM member_dues d
       JOIN members m ON m.member_id = d.member_id
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
  run(conn, `UPDATE member_dues SET paid_amount = ?, status = ?, paid_at = ? WHERE due_id = ?`, [
    paidAmount,
    status,
    paidDate ?? null,
    dueId,
  ]);

export const activeMembers = (conn) =>
  run(
    conn,
    `SELECT m.*, m.full_name AS member_name, m.email
       FROM members m
      WHERE m.status = 'active' AND m.deleted_at IS NULL`
  );

export const attachments = (conn, dueId) =>
  run(conn, `SELECT * FROM member_due_attachments WHERE due_id = ? ORDER BY uploaded_at DESC`, [dueId]);

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

export const memberStatementDues = (conn, memberId, { fromDate, toDate }) => {
  const conditions = ['d.member_id = ?'];
  const params = [memberId];
  if (fromDate) {
    conditions.push('b.generated_at::date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('b.generated_at::date <= ?');
    params.push(toDate);
  }
  return run(
    conn,
    `SELECT d.due_id, d.amount, d.paid_amount, d.status,
            b.month, b.year, b.generated_at AS generated_date
       FROM member_dues d
       JOIN member_due_batches b ON b.batch_id = d.batch_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY b.generated_at ASC, d.due_id ASC`,
    params
  );
};

export const memberStatementPayments = (conn, memberId, { fromDate, toDate }) => {
  const conditions = ['p.member_id = ?'];
  const params = [memberId];
  if (fromDate) {
    conditions.push('p.paid_at >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('p.paid_at <= ?');
    params.push(toDate);
  }
  return run(
    conn,
    `SELECT p.payment_id AS due_payment_id, p.amount, p.paid_at AS paid_date, p.created_at,
            b.month, b.year
       FROM member_due_payments p
       JOIN member_dues d ON d.due_id = p.due_id
       JOIN member_due_batches b ON b.batch_id = d.batch_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.paid_at ASC, p.payment_id ASC`,
    params
  );
};

export const memberOutstanding = (conn, memberId) =>
  run(
    conn,
    `SELECT COALESCE(SUM(d.amount - d.paid_amount), 0) AS outstanding
       FROM member_dues d
      WHERE d.member_id = ?`,
    [memberId]
  ).then((r) => Number(r[0]?.outstanding ?? 0));

export const getMemberCreditBalance = (conn, memberId) =>
  run(conn, `SELECT credit_balance FROM members WHERE member_id = ?`, [memberId]).then((r) =>
    Number(r[0]?.credit_balance ?? 0)
  );

export const adjustMemberCredit = (conn, memberId, delta) =>
  run(conn, `UPDATE members SET credit_balance = credit_balance + ? WHERE member_id = ?`, [
    delta,
    memberId,
  ]);

export const addCreditLedger = async (
  conn,
  { member_id, amount, description, credit_date, acc_id, created_by }
) => {
  const amt = Number(amount);
  if (amt > 0) {
    const loan_number = await generateNumber(conn, 'member_loans', 'loan_number', 'LOAN-');
    return run(
      conn,
      `INSERT INTO member_loans
         (member_id, account_id, loan_number, loan_date, amount, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [member_id, acc_id, loan_number, credit_date, amt, description ?? null, created_by]
    ).then((r) => r.insertId);
  }

  const loan = await run(
    conn,
    `SELECT * FROM member_loans
      WHERE member_id = ? AND status IN ('Pending', 'Partial')
      ORDER BY loan_date ASC, loan_id ASC
      LIMIT 1`,
    [member_id]
  ).then((rows) => rows[0]);

  if (!loan) {
    throw new Error('No open member loan to repay');
  }

  const payAmt = Math.abs(amt);
  const paidSoFar = Number(loan.paid_amount) + payAmt;
  const status = paidSoFar >= Number(loan.amount) - 0.001 ? 'Paid' : 'Partial';

  await run(conn, `UPDATE member_loans SET paid_amount = ?, status = ? WHERE loan_id = ?`, [
    paidSoFar,
    status,
    loan.loan_id,
  ]);

  return run(
    conn,
    `INSERT INTO member_loan_payments
       (loan_id, member_id, account_id, amount, paid_at, received_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [loan.loan_id, member_id, acc_id, payAmt, credit_date, created_by]
  ).then((r) => r.insertId);
};

export const memberCreditLedger = (conn, memberId, { fromDate, toDate }) => {
  const loanConds = ['ml.member_id = ?'];
  const payConds = ['mlp.member_id = ?'];
  const loanParams = [memberId];
  const payParams = [memberId];
  if (fromDate) {
    loanConds.push('ml.loan_date >= ?');
    payConds.push('mlp.paid_at >= ?');
    loanParams.push(fromDate);
    payParams.push(fromDate);
  }
  if (toDate) {
    loanConds.push('ml.loan_date <= ?');
    payConds.push('mlp.paid_at <= ?');
    loanParams.push(toDate);
    payParams.push(toDate);
  }
  return run(
    conn,
    `SELECT * FROM (
        SELECT ml.loan_id AS credit_id, ml.member_id, ml.amount, ml.description,
               ml.loan_date AS credit_date, ml.account_id AS acc_id, ml.created_by, ml.created_at
          FROM member_loans ml
         WHERE ${loanConds.join(' AND ')}
        UNION ALL
        SELECT mlp.loan_payment_id, mlp.member_id, -mlp.amount, mlp.notes,
               mlp.paid_at, mlp.account_id, mlp.received_by, mlp.created_at
          FROM member_loan_payments mlp
         WHERE ${payConds.join(' AND ')}
      ) ledger
      ORDER BY credit_date ASC, credit_id ASC`,
    [...loanParams, ...payParams]
  );
};

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
  createDuePayment,
  activeMembers,
  memberStatementDues,
  memberStatementPayments,
  memberOutstanding,
  getMemberCreditBalance,
  adjustMemberCredit,
  addCreditLedger,
  memberCreditLedger,
  attachments,
  addAttachment,
  findAttachment,
  deleteAttachment,
};
