import run from './_base.js';

/**
 * Append-only ledger. The running balance is computed atomically at insert
 * time from the most recent row (locked), so the ledger can never drift under
 * concurrent writers sharing a transaction connection.
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
    created_by,
  } = data;

  // Serialize balance reads when running inside a transaction connection.
  if (conn) {
    await conn.query(`SELECT transaction_id FROM transactions ORDER BY transaction_id DESC LIMIT 1 FOR UPDATE`);
  }

  return run(
    conn,
    `INSERT INTO transactions
       (transaction_date, transaction_type, reference_type, reference_id, description, income, expense, balance_after, created_by)
     SELECT ?, ?, ?, ?, ?, ?, ?,
            COALESCE((SELECT balance_after FROM transactions ORDER BY transaction_id DESC LIMIT 1), 0) + (? - ?), ?
     `,
    [
      transaction_date,
      transaction_type,
      reference_type,
      reference_id,
      description ?? null,
      income ?? 0,
      expense ?? 0,
      income ?? 0,
      expense ?? 0,
      created_by,
    ]
  ).then((r) => r.insertId);
};

export const findById = (conn, id) =>
  run(conn, `SELECT * FROM transactions WHERE transaction_id = ?`, [id]).then((rows) => rows[0]);

export const list = (conn, { type, fromDate, toDate, offset, perPage, order }) => {
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
  return run(
    conn,
    `SELECT t.*, u.full_name AS created_by_name
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
  return run(conn, `SELECT COUNT(*) AS total FROM transactions t ${where}`, params).then((r) => r[0].total);
};

export const currentBalance = (conn) =>
  run(conn, `SELECT balance_after FROM transactions ORDER BY transaction_id DESC LIMIT 1`).then(
    (r) => r[0]?.balance_after ?? 0
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
        COALESCE(SUM(income), 0) AS total_income,
        COALESCE(SUM(expense), 0) AS total_expense,
        COALESCE(SUM(income) - SUM(expense), 0) AS net
       FROM transactions ${where}`,
    params
  ).then((r) => r[0]);
};

export const updateIncomeDateByReference = (conn, referenceType, referenceId, transactionDate) =>
  run(
    conn,
    `UPDATE transactions
        SET transaction_date = ?
      WHERE reference_type = ? AND reference_id = ? AND transaction_type = 'Income' AND income > 0
      ORDER BY transaction_id DESC
      LIMIT 1`,
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
  const column = type === 'Expense' ? 'expense' : 'income';
  return run(
    conn,
    `SELECT COALESCE(SUM(${column}), 0) AS total FROM transactions WHERE ${conditions.join(' AND ')}`,
    params
  ).then((r) => Number(r[0]?.total ?? 0));
};

export default { create, findById, list, count, currentBalance, summary, sumByType, updateIncomeDateByReference };
