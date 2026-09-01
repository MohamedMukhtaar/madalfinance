import run from './_base.js';
import {
  applyRunningBalances,
  computeOpeningBalance,
  movementNet,
  toAccounting,
} from '../helpers/accounting.js';

export const findById = (conn, id) =>
  run(conn, `SELECT * FROM accounts WHERE acc_id = ?`, [id]).then((rows) => rows[0]);

export const list = (conn) =>
  run(conn, `SELECT * FROM accounts ORDER BY is_default DESC, institution ASC, number ASC`);

export const findDefault = (conn) =>
  run(conn, `SELECT * FROM accounts WHERE is_default = 1 LIMIT 1`).then((rows) => rows[0]);

export const create = (conn, { number, institution, balance, is_default }) =>
  run(
    conn,
    `INSERT INTO accounts (number, institution, balance, is_default) VALUES (?, ?, ?, ?)`,
    [number, institution, balance ?? 0, is_default ? 1 : 0]
  ).then((r) => r.insertId);

export const update = (conn, id, { number, institution }) =>
  run(conn, `UPDATE accounts SET number = ?, institution = ? WHERE acc_id = ?`, [
    number,
    institution,
    id,
  ]);

export const clearDefault = (conn) => run(conn, `UPDATE accounts SET is_default = 0`);

export const setDefault = (conn, id) =>
  run(conn, `UPDATE accounts SET is_default = 1 WHERE acc_id = ?`, [id]);

export const updateBalance = (conn, id, balance) =>
  run(conn, `UPDATE accounts SET balance = ? WHERE acc_id = ?`, [balance, id]);

export const adjustBalance = async (conn, id, delta) => {
  const account = await findById(conn, id);
  if (!account) return null;
  const next = Number(account.balance) + Number(delta);
  await updateBalance(conn, id, next);
  return next;
};

export const createTransfer = (conn, data) => {
  const { from_acc_id, to_acc_id, amount, transfer_date, notes, created_by } = data;
  return run(
    conn,
    `INSERT INTO account_transfers (from_acc_id, to_acc_id, amount, transfer_date, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [from_acc_id, to_acc_id, amount, transfer_date, notes ?? null, created_by]
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
    conditions.push('(t.from_acc_id = ? OR t.to_acc_id = ?)');
    params.push(accId, accId);
  }
  return run(
    conn,
    `SELECT t.*,
            fa.number AS from_number, fa.institution AS from_institution,
            ta.number AS to_number, ta.institution AS to_institution,
            u.full_name AS created_by_name
       FROM account_transfers t
       JOIN accounts fa ON fa.acc_id = t.from_acc_id
       JOIN accounts ta ON ta.acc_id = t.to_acc_id
       JOIN users u ON u.user_id = t.created_by
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.transfer_date DESC, t.transfer_id DESC`,
    params
  );
};

const appendDate = (col, { fromDate, toDate } = {}, params) => {
  let clause = '';
  if (fromDate) {
    clause += ` AND ${col} >= ?`;
    params.push(fromDate);
  }
  if (toDate) {
    clause += ` AND ${col} <= ?`;
    params.push(toDate);
  }
  return clause;
};

/** Single UNION ALL subquery for all cash movements on an account. */
const buildMovementUnion = (accId, filters = {}) => {
  const params = [];
  const parts = [];

  const pushPart = (sql, partParams) => {
    parts.push(sql);
    params.push(...partParams);
  };

  const payParams = [accId];
  const payClause = appendDate('p.payment_date', filters, payParams);
  pushPart(
    `SELECT p.payment_date AS movement_date, 'income' AS movement_type,
            p.amount, p.payment_number AS reference_label,
            CONCAT('Payment ', p.payment_number, ' — ', c.customer_name) AS description
       FROM payments p
       JOIN customers c ON c.customer_id = p.customer_id
      WHERE p.acc_id = ? AND p.deleted_at IS NULL ${payClause}`,
    payParams
  );

  const mdpParams = [accId];
  const mdpClause = appendDate('mdp.paid_date', filters, mdpParams);
  pushPart(
    `SELECT mdp.paid_date AS movement_date, 'income' AS movement_type,
            mdp.amount, CONCAT('CON-', mdp.due_payment_id) AS reference_label,
            CONCAT('Contribution — ', m.full_name,
              CASE WHEN b.month IS NOT NULL AND b.year IS NOT NULL
                   THEN CONCAT(' (', b.month, '/', b.year, ')')
                   ELSE '' END) AS description
       FROM member_due_payments mdp
       JOIN member_dues d ON d.due_id = mdp.due_id
       JOIN member_due_batches b ON b.batch_id = d.batch_id
       JOIN members m ON m.member_id = d.member_id
      WHERE mdp.acc_id = ? ${mdpClause}`,
    mdpParams
  );

  const expParams = [accId];
  const expClause = appendDate('e.expense_date', filters, expParams);
  pushPart(
    `SELECT e.expense_date AS movement_date, 'expense' AS movement_type,
            e.amount, e.reference_number AS reference_label,
            CONCAT('Expense — ', COALESCE(e.description, ec.category_name)) AS description
       FROM expenses e
       JOIN expense_categories ec ON ec.expense_category_id = e.expense_category_id
      WHERE e.acc_id = ? AND e.deleted_at IS NULL ${expClause}`,
    expParams
  );

  const mcParams = [accId];
  const mcClause = appendDate('mcl.credit_date', filters, mcParams);
  pushPart(
    `SELECT mcl.credit_date AS movement_date,
            CASE WHEN mcl.amount > 0 THEN 'loan_out' ELSE 'loan_repay' END AS movement_type,
            ABS(mcl.amount) AS amount,
            CONCAT('MLN-', mcl.credit_id) AS reference_label,
            CASE WHEN mcl.amount > 0
              THEN CONCAT('Member loan — ', m.full_name,
                CASE WHEN mcl.description IS NOT NULL AND mcl.description != ''
                     THEN CONCAT(' — ', mcl.description) ELSE '' END)
              ELSE CONCAT('Loan repayment — ', m.full_name,
                CASE WHEN mcl.description IS NOT NULL AND mcl.description != ''
                     THEN CONCAT(' — ', mcl.description) ELSE '' END)
            END AS description
       FROM member_credit_ledger mcl
       JOIN members m ON m.member_id = mcl.member_id
      WHERE mcl.acc_id = ? AND mcl.amount != 0 ${mcClause}`,
    mcParams
  );

  const trOutParams = [accId];
  const trOutClause = appendDate('t.transfer_date', filters, trOutParams);
  pushPart(
    `SELECT t.transfer_date AS movement_date, 'transfer_out' AS movement_type,
            t.amount, CONCAT('TRF-', t.transfer_id) AS reference_label,
            CONCAT('Transfer to ', ta.institution, ' (', ta.number, ')') AS description
       FROM account_transfers t
       JOIN accounts ta ON ta.acc_id = t.to_acc_id
      WHERE t.from_acc_id = ? ${trOutClause}`,
    trOutParams
  );

  const trInParams = [accId];
  const trInClause = appendDate('t.transfer_date', filters, trInParams);
  pushPart(
    `SELECT t.transfer_date AS movement_date, 'transfer_in' AS movement_type,
            t.amount, CONCAT('TRF-', t.transfer_id) AS reference_label,
            CONCAT('Transfer from ', fa.institution, ' (', fa.number, ')') AS description
       FROM account_transfers t
       JOIN accounts fa ON fa.acc_id = t.from_acc_id
      WHERE t.to_acc_id = ? ${trInClause}`,
    trInParams
  );

  return { sql: parts.join(' UNION ALL '), params };
};

const listRawMovements = (conn, accId, filters, { offset, perPage } = {}) => {
  const { sql, params } = buildMovementUnion(accId, filters);
  const limitClause =
    perPage != null ? ` LIMIT ${Number(perPage)} OFFSET ${Number(offset ?? 0)}` : '';
  return run(
    conn,
    `SELECT * FROM (${sql}) AS movements
      ORDER BY movement_date ASC, reference_label ASC
      ${limitClause}`,
    params
  );
};

const countMovements = (conn, accId, filters) => {
  const { sql, params } = buildMovementUnion(accId, filters);
  return run(conn, `SELECT COUNT(*) AS total FROM (${sql}) AS movements`, params).then(
    (rows) => Number(rows[0]?.total ?? 0)
  );
};

/**
 * Cash account statement using standard accounting:
 * - Debit  = receipt (cash in)  → increases balance
 * - Credit = payment (cash out) → decreases balance
 */
export const statement = async (conn, accId, { fromDate, toDate, offset = 0, perPage } = {}) => {
  const account = await findById(conn, accId);
  if (!account) return { movements: [], total: 0 };

  const periodFilters = { fromDate, toDate };
  const total = await countMovements(conn, accId, periodFilters);

  let afterFromNet = 0;
  let periodNet = 0;
  if (fromDate) {
    afterFromNet = movementNet(await listRawMovements(conn, accId, { fromDate }));
  } else {
    periodNet = movementNet(await listRawMovements(conn, accId, periodFilters));
  }

  const openingBalance = computeOpeningBalance(account.balance, periodNet, afterFromNet, fromDate);

  let pageOpening = openingBalance;
  const pageOffset = Number(offset ?? 0);
  if (pageOffset > 0) {
    const prior = await listRawMovements(conn, accId, periodFilters, {
      offset: 0,
      perPage: pageOffset,
    });
    pageOpening = Math.round((openingBalance + movementNet(prior)) * 100) / 100;
  }

  const periodRows = await listRawMovements(conn, accId, periodFilters, { offset: pageOffset, perPage });
  const movements = applyRunningBalances(periodRows, pageOpening, {
    includeOpeningRow: pageOffset === 0,
  });

  return { movements, total, openingBalance };
};

export { toAccounting, movementNet };

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
