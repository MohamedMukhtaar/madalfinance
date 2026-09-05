import run from './_base.js';
import { generateNumber } from '../helpers/numberGenerator.js';

const ACCOUNT_COLS = `
  a.account_id AS acc_id,
  a.account_id,
  a.account_name AS institution,
  a.account_name,
  a.account_number AS number,
  a.account_number,
  a.account_type,
  a.opening_balance,
  a.balance,
  a.is_default,
  a.status,
  a.created_at,
  a.updated_at
`;

export const findById = (conn, id) =>
  run(conn, `SELECT ${ACCOUNT_COLS} FROM accounts a WHERE a.account_id = ?`, [id]).then(
    (rows) => rows[0]
  );

export const list = (conn) =>
  run(
    conn,
    `SELECT ${ACCOUNT_COLS} FROM accounts a
      ORDER BY a.is_default DESC, a.account_name ASC, a.account_number ASC`
  );

export const findDefault = (conn) =>
  run(
    conn,
    `SELECT ${ACCOUNT_COLS} FROM accounts a WHERE a.is_default = TRUE LIMIT 1`
  ).then((rows) => rows[0]);

export const create = (conn, { number, institution, balance, is_default, account_type }) =>
  run(
    conn,
    `INSERT INTO accounts (account_name, account_type, account_number, opening_balance, balance, is_default)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      institution,
      account_type || 'Cash',
      number ?? null,
      balance ?? 0,
      balance ?? 0,
      Boolean(is_default),
    ]
  ).then((r) => r.insertId);

export const update = (conn, id, { number, institution }) =>
  run(conn, `UPDATE accounts SET account_number = ?, account_name = ? WHERE account_id = ?`, [
    number,
    institution,
    id,
  ]);

export const clearDefault = (conn) => run(conn, `UPDATE accounts SET is_default = FALSE`);

export const setDefault = (conn, id) =>
  run(conn, `UPDATE accounts SET is_default = TRUE WHERE account_id = ?`, [id]);

export const updateBalance = (conn, id, balance) =>
  run(conn, `UPDATE accounts SET balance = ? WHERE account_id = ?`, [balance, id]);

export const adjustBalance = async (conn, id, delta) => {
  const account = await findById(conn, id);
  if (!account) return null;
  const next = Number(account.balance) + Number(delta);
  await updateBalance(conn, id, next);
  return next;
};

export const createTransfer = async (conn, data) => {
  const { from_acc_id, to_acc_id, amount, transfer_date, notes, created_by } = data;
  const transfer_number = await generateNumber(conn, 'account_transfers', 'transfer_number', 'TRF-');
  return run(
    conn,
    `INSERT INTO account_transfers
       (transfer_number, from_account_id, to_account_id, amount, transfer_date, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [transfer_number, from_acc_id, to_acc_id, amount, transfer_date, notes ?? null, created_by]
  ).then((r) => r.insertId);
};

export const listTransfers = (conn, { fromDate, toDate, accId } = {}) => {
  const conditions = ['1=1'];
  const params = [];
  if (fromDate) {
    conditions.push('t.transfer_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('t.transfer_date <= ?');
    params.push(toDate);
  }
  if (accId) {
    conditions.push('(t.from_account_id = ? OR t.to_account_id = ?)');
    params.push(accId, accId);
  }
  return run(
    conn,
    `SELECT t.*,
            t.from_account_id AS from_acc_id,
            t.to_account_id AS to_acc_id,
            fa.account_number AS from_number, fa.account_name AS from_institution,
            ta.account_number AS to_number, ta.account_name AS to_institution,
            u.full_name AS created_by_name
       FROM account_transfers t
       JOIN accounts fa ON fa.account_id = t.from_account_id
       JOIN accounts ta ON ta.account_id = t.to_account_id
       JOIN users u ON u.user_id = t.created_by
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.transfer_date DESC, t.transfer_id DESC`,
    params
  );
};

const mapStatementRow = (row) => ({
  movement_date: row.Date,
  movement_type: String(row.Type || '').toLowerCase(),
  amount: Number(row.Dr || 0) + Number(row.Cr || 0) + Number(row.Loan || 0),
  reference_label: row.Reference,
  description: row.Type,
  debit: Number(row.Dr || 0),
  credit: Number(row.Cr || 0),
  loan: Number(row.Loan || 0),
  balance: Number(row.Balance || 0),
  time: row.Time,
});

/**
 * Cash account statement from the PostgreSQL account_statement() function.
 */
export const statement = async (conn, accId, { fromDate, toDate, offset = 0, perPage } = {}) => {
  const account = await findById(conn, accId);
  if (!account) return { movements: [], total: 0 };

  const start = fromDate || '1970-01-01';
  const end = toDate || '2999-12-31';
  const rows = await run(conn, `SELECT * FROM account_statement(?, ?::date, ?::date)`, [
    accId,
    start,
    end,
  ]);
  const mapped = (rows || []).map(mapStatementRow);
  const openingBalance = mapped[0]?.movement_type === 'opening' ? mapped[0].balance : 0;
  const total = mapped.length;
  const startIdx = Number(offset ?? 0);
  const endIdx = perPage != null ? startIdx + Number(perPage) : mapped.length;
  return {
    movements: mapped.slice(startIdx, endIdx),
    total,
    openingBalance,
  };
};

export default {
  findById,
  list,
  findDefault,
  create,
  update,
  clearDefault,
  setDefault,
  updateBalance,
  adjustBalance,
  createTransfer,
  listTransfers,
  statement,
};
