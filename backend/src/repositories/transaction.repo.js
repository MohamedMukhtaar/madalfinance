import run from './_base.js';

/**
 * Append-only per-account ledger.
 *
 * Callers may still pass `income` / `expense` (legacy). Those are mapped to
 * debit / credit / loan to match the statement format:
 * Date | Time | Type | Reference | Debit | Credit | Loan | Balance
 */
export const create = async (conn, data) => {
  const {
    transaction_date,
    transaction_type,
    reference_type,
    reference_id,
    description,
    income,
    expense,
    debit,
    credit,
    loan,
    created_by,
    account_id,
    acc_id,
  } = data;

  let resolvedAccountId = account_id ?? acc_id;
  if (!resolvedAccountId) {
    const def = await run(conn, `SELECT account_id FROM accounts WHERE is_default = TRUE LIMIT 1`);
    resolvedAccountId = def[0]?.account_id;
  }
  if (!resolvedAccountId) {
    throw new Error('account_id is required to post a transaction');
  }

  let d = Number(debit ?? 0);
  let c = Number(credit ?? 0);
  let l = Number(loan ?? 0);

  if (d === 0 && c === 0 && l === 0) {
    const inc = Number(income ?? 0);
    const exp = Number(expense ?? 0);
    if (transaction_type === 'Loan' && exp > 0) {
      l = exp;
    } else if (transaction_type === 'Loan' && inc > 0) {
      d = inc;
    } else if (transaction_type === 'Transfer' && exp > 0) {
      c = exp;
    } else if (transaction_type === 'Transfer' && inc > 0) {
      d = inc;
    } else {
      d = inc;
      c = exp;
    }
  }

  if (conn) {
    await run(
      conn,
      `SELECT transaction_id FROM transactions
        WHERE account_id = ?
        ORDER BY transaction_id DESC LIMIT 1 FOR UPDATE`,
      [resolvedAccountId]
    );
  }

  return run(
    conn,
    `INSERT INTO transactions
       (transaction_date, transaction_type, account_id, reference_type, reference_id,
        description, debit, credit, loan, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      transaction_date,
      transaction_type,
      resolvedAccountId,
      reference_type,
      reference_id ?? null,
      description ?? null,
      d,
      c,
      l,
      created_by,
    ]
  ).then((r) => r.insertId);
};

const TX_SELECT = `
  t.*,
  t.debit AS income,
  t.credit AS expense,
  t.account_id AS acc_id,
  u.full_name AS created_by_name
`;

export const findById = (conn, id) =>
  run(
    conn,
    `SELECT ${TX_SELECT}
       FROM transactions t JOIN users u ON u.user_id = t.created_by
      WHERE t.transaction_id = ?`,
    [id]
  ).then((rows) => rows[0]);

export const list = (conn, { type, fromDate, toDate, offset, perPage, order }) => {
  const conditions = [];
  const params = [];
  if (type) {
    conditions.push('t.transaction_type = ?');
    params.push(type);
  }
  if (fromDate) {
    conditions.push('t.transaction_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('t.transaction_date <= ?');
    params.push(toDate);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return run(
    conn,
    `SELECT ${TX_SELECT}
       FROM transactions t JOIN users u ON u.user_id = t.created_by
       ${where}
      ORDER BY ${order}
      LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
};

export const count = (conn, { type, fromDate, toDate }) => {
  const conditions = [];
  const params = [];
  if (type) {
    conditions.push('transaction_type = ?');
    params.push(type);
  }
  if (fromDate) {
    conditions.push('transaction_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('transaction_date <= ?');
    params.push(toDate);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return run(conn, `SELECT COUNT(*) AS total FROM transactions t ${where}`, params).then(
    (r) => r[0].total
  );
};

export const currentBalance = (conn) =>
  run(conn, `SELECT COALESCE(SUM(balance), 0) AS balance FROM accounts`).then(
    (r) => r[0]?.balance ?? 0
  );

export const summary = (conn, { fromDate, toDate }) => {
  const conditions = [];
  const params = [];
  if (fromDate) {
    conditions.push('transaction_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('transaction_date <= ?');
    params.push(toDate);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return run(
    conn,
    `SELECT
        COALESCE(SUM(debit), 0) AS total_income,
        COALESCE(SUM(credit), 0) AS total_expense,
        COALESCE(SUM(debit) - SUM(credit), 0) AS net
       FROM transactions ${where}`,
    params
  ).then((r) => r[0]);
};

export const updateIncomeDateByReference = (conn, referenceType, referenceId, transactionDate) =>
  run(
    conn,
    `UPDATE transactions
        SET transaction_date = ?
      WHERE transaction_id = (
        SELECT transaction_id FROM transactions
         WHERE reference_type = ? AND reference_id = ? AND transaction_type = 'Income' AND debit > 0
         ORDER BY transaction_id DESC
         LIMIT 1
      )`,
    [transactionDate, referenceType, referenceId]
  );

export const sumByType = (conn, { type, fromDate, toDate }) => {
  const conditions = ['transaction_type = ?'];
  const params = [type];
  if (fromDate) {
    conditions.push('transaction_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('transaction_date <= ?');
    params.push(toDate);
  }
  const column = type === 'Expense' ? 'credit' : 'debit';
  return run(
    conn,
    `SELECT COALESCE(SUM(${column}), 0) AS total FROM transactions WHERE ${conditions.join(' AND ')}`,
    params
  ).then((r) => Number(r[0]?.total ?? 0));
};

export default {
  create,
  findById,
  list,
  count,
  currentBalance,
  summary,
  sumByType,
  updateIncomeDateByReference,
};
