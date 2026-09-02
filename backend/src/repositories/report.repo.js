import run from './_base.js';

/** P&L uses operating income/expense only — member loans are balance-sheet cash movements. */
const PNL_EXCLUDE_TYPES = `'Loan'`;

/** Income / expense totals between dates (income statement). */
export const incomeStatement = (conn, { fromDate, toDate }) => {
  const conditions = [`transaction_type NOT IN (${PNL_EXCLUDE_TYPES})`];
  const params = [];
  if (fromDate) {
    conditions.push('transaction_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('transaction_date <= ?');
    params.push(toDate);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return run(
    conn,
    `SELECT COALESCE(SUM(income), 0) AS total_income,
            COALESCE(SUM(expense), 0) AS total_expense,
            COALESCE(SUM(income), 0) - COALESCE(SUM(expense), 0) AS net_profit
       FROM transactions ${where}`,
    params
  ).then((r) => r[0]);
};

/** Monthly income/expense buckets for the last N months. */
export const monthlySummary = (conn, months) =>
  run(
    conn,
    `SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS month,
            COALESCE(SUM(income), 0) AS income,
            COALESCE(SUM(expense), 0) AS expense,
            COALESCE(SUM(income), 0) - COALESCE(SUM(expense), 0) AS net
       FROM transactions
      WHERE transaction_type NOT IN (${PNL_EXCLUDE_TYPES})
        AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
      ORDER BY month ASC`,
    [months]
  );

export const cashFlow = (conn, fromDate, toDate) => {
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
    `SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS month,
            COALESCE(SUM(income), 0) AS inflow,
            COALESCE(SUM(expense), 0) AS outflow,
            COALESCE(SUM(income), 0) - COALESCE(SUM(expense), 0) AS net
       FROM transactions ${where}
      GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
      ORDER BY month ASC`,
    params
  );
};

/** Rental revenue = income booked against Rental Billing / rental invoices. */
export const rentalRevenue = (conn, fromDate, toDate) => {
  const conditions = [
    `transaction_type = 'Income'`,
    `reference_type IN ('Rental Billing', 'Payment')`,
  ];
  const params = [];
  if (fromDate) {
    conditions.push('transaction_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('transaction_date <= ?');
    params.push(toDate);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return run(
    conn,
    `SELECT COALESCE(SUM(income), 0) AS total,
            COUNT(*) AS billings
       FROM transactions
       ${where}`,
    params
  ).then((r) => r[0]);
};

export const outstandingCustomers = (conn) =>
  run(
    conn,
    `SELECT c.customer_id, c.customer_code, c.customer_name, c.company_name, c.phone, c.email,
            COALESCE(SUM(i.total_amount - i.paid_amount), 0) AS outstanding,
            COUNT(CASE WHEN i.status IN ('Issued','Partial','Overdue') THEN 1 END) AS open_invoices
       FROM customers c
       LEFT JOIN invoices i ON i.customer_id = c.customer_id AND i.deleted_at IS NULL AND i.status IN ('Issued','Partial','Overdue')
      WHERE c.deleted_at IS NULL
      GROUP BY c.customer_id
      HAVING outstanding > 0
      ORDER BY outstanding DESC`
  );

/** All customers with invoiced / paid / outstanding totals and payment status. */
export const customerPaymentStatus = (conn) =>
  run(
    conn,
    `SELECT c.customer_id, c.customer_code, c.customer_name, c.company_name, c.phone, c.email,
            COALESCE(SUM(i.total_amount), 0) AS total_invoiced,
            COALESCE(SUM(i.paid_amount), 0) AS total_paid,
            COALESCE(SUM(CASE WHEN i.status IN ('Issued','Partial','Overdue') THEN i.total_amount - i.paid_amount ELSE 0 END), 0) AS outstanding,
            COUNT(CASE WHEN i.status IN ('Issued','Partial','Overdue') THEN 1 END) AS open_invoices,
            (
              SELECT MAX(p.created_at)
                FROM payments p
               WHERE p.customer_id = c.customer_id AND p.deleted_at IS NULL
            ) AS last_payment_at
       FROM customers c
       LEFT JOIN invoices i ON i.customer_id = c.customer_id AND i.deleted_at IS NULL AND i.status NOT IN ('Draft','Cancelled')
      WHERE c.deleted_at IS NULL
      GROUP BY c.customer_id, c.customer_code, c.customer_name, c.company_name, c.phone, c.email
      ORDER BY outstanding DESC, c.customer_name ASC`
  );

/** Per-category expense breakdown. Dates optional — omit for all-time. */
export const expenseByCategory = (conn, fromDate, toDate) => {
  const joinConds = ['e.expense_category_id = ec.expense_category_id', 'e.deleted_at IS NULL'];
  const params = [];
  if (fromDate) {
    joinConds.push('e.expense_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    joinConds.push('e.expense_date <= ?');
    params.push(toDate);
  }
  return run(
    conn,
    `SELECT ec.category_name, COALESCE(SUM(e.amount), 0) AS total, COUNT(e.expense_id) AS count
       FROM expense_categories ec
       LEFT JOIN expenses e ON ${joinConds.join(' AND ')}
      GROUP BY ec.expense_category_id, ec.category_name
      ORDER BY total DESC`,
    params
  );
};

export const contributionReport = (conn, batchId) =>
  run(
    conn,
    `SELECT b.month, b.year, b.default_amount, u.full_name AS generated_by, b.generated_date,
            COUNT(d.due_id) AS total_dues,
            COALESCE(SUM(d.amount), 0) AS expected,
            COALESCE(SUM(d.paid_amount), 0) AS collected,
            SUM(CASE WHEN d.status = 'Pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN d.status = 'Partial' THEN 1 ELSE 0 END) AS partial,
            SUM(CASE WHEN d.status = 'Paid' THEN 1 ELSE 0 END) AS paid
       FROM member_due_batches b
       LEFT JOIN member_dues d ON d.batch_id = b.batch_id
       JOIN users u ON u.user_id = b.generated_by
      WHERE b.batch_id = ?
      GROUP BY b.batch_id, b.month, b.year, b.default_amount, u.full_name, b.generated_date`,
    [batchId]
  ).then((rows) => rows[0]);

export const projectReport = (conn) =>
  run(
    conn,
    `SELECT p.status,
            COUNT(*) AS count,
            COALESCE(SUM(p.project_price), 0) AS value
       FROM projects p
      WHERE p.deleted_at IS NULL
      GROUP BY p.status
      ORDER BY count DESC`
  );

export default {
  incomeStatement,
  monthlySummary,
  cashFlow,
  rentalRevenue,
  outstandingCustomers,
  customerPaymentStatus,
  expenseByCategory,
  contributionReport,
  projectReport,
};
