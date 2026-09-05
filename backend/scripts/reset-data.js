/**
 * Clear all business data while keeping login accounts.
 * Preserves: roles, users, reference lookups, settings.
 *
 * Usage: node scripts/reset-data.js
 */
import { pool } from '../src/config/db.js';
import logger from '../src/utils/logger.js';

const TABLES_TO_CLEAR = [
  'trash_bin',
  'audit_logs',
  'refresh_tokens',
  'export_jobs',
  'transactions',
  'expense_charge_attachments',
  'expense_payments',
  'expense_charges',
  'member_due_attachments',
  'member_due_payments',
  'member_dues',
  'member_due_batches',
  'member_loan_payments',
  'member_loans',
  'payment_attachments',
  'payment_allocations',
  'payments',
  'invoice_attachments',
  'invoice_items',
  'invoices',
  'rental_billings',
  'contracts',
  'project_customers',
  'projects',
  'customer_contacts',
  'customers',
  'members',
  'other_income',
  'salary_payments',
  'salary_charges',
  'account_transfers',
];

const run = async () => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('SET session_replication_role = replica');

    for (const table of TABLES_TO_CLEAR) {
      const [exists] = await conn.query(`SELECT to_regclass($1) AS reg`, [`public.${table}`]);
      if (!exists[0]?.reg) {
        logger.info(`SKIP ${table} (table not found)`);
        continue;
      }
      await conn.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
      logger.info(`Cleared ${table}`);
    }

    await conn.query('SET session_replication_role = DEFAULT');
    await conn.commit();

    const [users] = await conn.query('SELECT COUNT(*) AS c FROM users');
    const [roles] = await conn.query('SELECT COUNT(*) AS c FROM roles');
    logger.info(`Done. Users kept: ${users[0].c}, roles kept: ${roles[0].c}`);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
};

run().catch((err) => {
  logger.error(err);
  process.exit(1);
});
