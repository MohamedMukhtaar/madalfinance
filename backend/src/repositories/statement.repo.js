import dayjs from 'dayjs';
import run from './_base.js';

const DEFAULT_FROM = '1970-01-01';
const DEFAULT_TO = '2999-12-31';

const formatTime = (value) => {
  if (value == null || value === '') return '00:00:00';
  if (typeof value === 'string') return value.length >= 8 ? value.slice(0, 8) : value;
  if (value instanceof Date) return dayjs(value).format('HH:mm:ss');
  return String(value);
};

const formatDate = (value) => {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value.slice(0, 10);
  return dayjs(value).format('YYYY-MM-DD');
};

/** Map account_statement / member_statement / … quoted columns to API rows. */
export const mapFnRow = (row = {}) => {
  const type = String(row.Type ?? row.type ?? '');
  const reference = String(row.Reference ?? row.reference ?? '');
  const debit = Number(row.Dr ?? row.dr ?? 0);
  const credit = Number(row.Cr ?? row.cr ?? 0);
  const loan = Number(row.Loan ?? row.loan ?? 0);
  return {
    id: Number(row.ID ?? row.id ?? 0),
    name: row.Name ?? row.name ?? '',
    phone: row.Phone ?? row.phone ?? null,
    type,
    reference,
    date: formatDate(row.Date ?? row.date),
    time: formatTime(row.Time ?? row.time),
    debit,
    credit,
    loan,
    due: debit,
    paid: credit,
    balance: Number(row.Balance ?? row.balance ?? 0),
    description: [type, reference].filter(Boolean).join(' ') || '—',
  };
};

const callFn = (conn, fnName, id, fromDate, toDate) =>
  run(conn, `SELECT * FROM ${fnName}(?, ?::date, ?::date)`, [
    id,
    fromDate || DEFAULT_FROM,
    toDate || DEFAULT_TO,
  ]).then((rows) => (rows || []).map(mapFnRow));

export const account = (conn, id, fromDate, toDate) =>
  callFn(conn, 'account_statement', id, fromDate, toDate);

export const member = (conn, id, fromDate, toDate) =>
  callFn(conn, 'member_statement', id, fromDate, toDate);

export const customer = (conn, id, fromDate, toDate) =>
  callFn(conn, 'customer_statement', id, fromDate, toDate);

export const project = (conn, id, fromDate, toDate) =>
  callFn(conn, 'project_statement', id, fromDate, toDate);

export const expense = (conn, id, fromDate, toDate) =>
  callFn(conn, 'expense_statement', id || 0, fromDate, toDate);

export const salary = (conn, id, fromDate, toDate) =>
  callFn(conn, 'salary_statement', id, fromDate, toDate);

export const totalsFromRows = (rows = []) => {
  const debit = rows.reduce((s, r) => s + Number(r.debit ?? 0), 0);
  const credit = rows.reduce((s, r) => s + Number(r.credit ?? 0), 0);
  const loan = rows.reduce((s, r) => s + Number(r.loan ?? 0), 0);
  const last = rows.length ? Number(rows[rows.length - 1].balance) : 0;
  return { debit, credit, loan, closing_balance: last };
};

export default { account, member, customer, project, expense, salary, mapFnRow, totalsFromRows };
