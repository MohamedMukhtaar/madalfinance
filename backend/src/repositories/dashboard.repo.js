import run from './_base.js';

function monthBounds(year, month) {
  if (year && month) {
    const y = Number(year);
    const m = Number(month);
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = new Date(y, m, 0);
    const end = `${y}-${String(m).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    return { start, end };
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = new Date(y, m, 0);
  const end = `${y}-${String(m).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  return { start, end };
}

/** Aggregate counters and sums for the frontend dashboard. Optional year/month scopes income & expense. */
export const dashboardStats = (conn, { year, month } = {}) => {
  const { start, end } = monthBounds(year, month);
  return run(
    conn,
    `SELECT
       (SELECT COALESCE(SUM(income), 0) - COALESCE(SUM(expense), 0)
          FROM transactions WHERE transaction_date <= ?) AS current_balance,
       (SELECT COALESCE(SUM(income), 0) FROM transactions
          WHERE transaction_type = 'Income' AND transaction_date BETWEEN ? AND ?) AS month_income,
       (SELECT COALESCE(SUM(expense), 0) FROM transactions
          WHERE transaction_type = 'Expense' AND transaction_date BETWEEN ? AND ?) AS month_expense,
       (SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL) AS total_customers,
       (SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL AND status = 'active') AS active_customers,
       (SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL AND status IN ('Pending','In Progress')) AS active_projects,
       (SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL AND status = 'Completed') AS completed_projects,
       (SELECT COALESCE(SUM(total_amount - paid_amount), 0) FROM invoices
          WHERE deleted_at IS NULL AND status IN ('Issued','Partial','Overdue')
            AND invoice_date <= ?) AS total_outstanding,
       (SELECT COUNT(*) FROM invoices
          WHERE deleted_at IS NULL AND status IN ('Issued','Partial','Overdue')
            AND invoice_date <= ?) AS open_invoices,
       (SELECT COUNT(*) FROM invoices
          WHERE deleted_at IS NULL AND status = 'Overdue' AND invoice_date <= ?) AS overdue_invoices,
       (SELECT COALESCE(SUM(amount), 0) FROM payments
          WHERE deleted_at IS NULL AND payment_date BETWEEN ? AND ?) AS total_collected,
       (SELECT COALESCE(SUM(d.amount), 0) - COALESCE(SUM(d.paid_amount), 0) FROM member_dues d) AS total_dues_balance,
       (SELECT COUNT(*) FROM rental_billings WHERE status = 'Active') AS active_rentals`,
    [end, start, end, start, end, end, end, end, start, end]
  ).then((rows) => rows[0]);
};

export const invoiceStatusCounts = (conn) =>
  run(conn, `SELECT status, COUNT(*) AS count FROM invoices WHERE deleted_at IS NULL GROUP BY status`);

export const recentTransactions = (conn, { limit = 8, fromDate, toDate } = {}) => {
  const conditions = [];
  const params = [];
  if (fromDate) {
    conditions.push('t.transaction_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('t.transaction_date <= ?');
    params.push(toDate);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);
  return run(
    conn,
    `SELECT t.*, u.full_name AS created_by_name FROM transactions t
       JOIN users u ON u.user_id = t.created_by
      ${where}
      ORDER BY t.transaction_date DESC, t.transaction_id DESC LIMIT ?`,
    params
  );
};

export const recentPayments = (conn, { limit = 6, fromDate, toDate } = {}) => {
  const conditions = ['p.deleted_at IS NULL'];
  const params = [];
  if (fromDate) {
    conditions.push('p.payment_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('p.payment_date <= ?');
    params.push(toDate);
  }
  params.push(limit);
  return run(
    conn,
    `SELECT p.*, c.customer_name FROM payments p
       JOIN customers c ON c.customer_id = p.customer_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.payment_date DESC, p.payment_id DESC LIMIT ?`,
    params
  );
};

export const recentExpenses = (conn, { limit = 50, fromDate, toDate } = {}) => {
  const conditions = ['e.deleted_at IS NULL'];
  const params = [];
  if (fromDate) {
    conditions.push('e.expense_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('e.expense_date <= ?');
    params.push(toDate);
  }
  params.push(limit);
  return run(
    conn,
    `SELECT e.*, ec.category_name FROM expenses e
       JOIN expense_categories ec ON ec.expense_category_id = e.expense_category_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.expense_date DESC, e.expense_id DESC LIMIT ?`,
    params
  );
};

export const rentalRenewals = (conn, days = 30) =>
  run(
    conn,
    `SELECT rb.*, p.project_name, c.customer_name
       FROM rental_billings rb
       JOIN projects p ON p.project_id = rb.project_id
       JOIN customers c ON c.customer_id = p.customer_id
      WHERE rb.status = 'Active'
        AND rb.next_billing_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY rb.next_billing_date ASC`,
    [days]
  );

export const dueStatusSummary = (conn, limit = 5) =>
  run(
    conn,
    `SELECT b.month, b.year, b.batch_id,
            SUM(CASE WHEN d.status = 'Paid' THEN 1 ELSE 0 END) AS paid,
            SUM(CASE WHEN d.status = 'Partial' THEN 1 ELSE 0 END) AS partial,
            SUM(CASE WHEN d.status = 'Pending' THEN 1 ELSE 0 END) AS pending
       FROM member_due_batches b
       LEFT JOIN member_dues d ON d.batch_id = b.batch_id
      GROUP BY b.batch_id
      ORDER BY b.year DESC, b.month DESC
      LIMIT ?`,
    [limit]
  );

/** Transactions for a chart window (up to 6 months ending at selected month). */
export const chartTransactions = (conn, { fromDate, toDate }) =>
  run(
    conn,
    `SELECT transaction_date, income, expense, transaction_type
       FROM transactions
      WHERE transaction_date BETWEEN ? AND ?
      ORDER BY transaction_date ASC`,
    [fromDate, toDate]
  );

export default {
  dashboardStats,
  invoiceStatusCounts,
  recentTransactions,
  recentPayments,
  recentExpenses,
  rentalRenewals,
  dueStatusSummary,
  chartTransactions,
  monthBounds,
};
