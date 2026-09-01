/**
 * Clear all business data while keeping login accounts.
 * Preserves: roles, users, reference lookups (project types, categories), settings.
 *
 * Usage: node scripts/reset-data.js
 */
import { pool } from '../src/config/db.js';
import logger from '../src/utils/logger.js';

const TABLES_TO_CLEAR = [
  'trash_bin',
  'audit_logs',
  'refresh_tokens',
  'transactions',
  'expense_attachments',
  'expenses',
  'member_due_attachments',
  'member_dues',
  'member_due_batches',
  'payment_attachments',
  'payment_allocations',
  'payments',
  'invoice_attachments',
  'invoice_items',
  'invoices',
  'rental_billings',
  'contracts',
  'projects',
  'customer_contacts',
  'customers',
  'members',
  'other_income',
];

const run = async () => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of TABLES_TO_CLEAR) {
      const [exists] = await conn.query(
        `SELECT COUNT(*) AS c FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = ?`,
        [table]
      );
      if (!exists[0]?.c) {
        logger.info(`SKIP ${table} (table not found)`);
        continue;
      }
      await conn.query(`TRUNCATE TABLE \`${table}\``);
      logger.info(`Cleared ${table}`);
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.commit();

    const [[users]] = await conn.query('SELECT COUNT(*) AS c FROM users');
    const [[roles]] = await conn.query('SELECT COUNT(*) AS c FROM roles');
    logger.info(`Done. Users kept: ${users.c}, roles kept: ${roles.c}`);
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
