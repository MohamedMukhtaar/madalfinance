/**
 * Seed two real examples after reset-data:
 *  - Feysal: one-time shop website $200
 *  - Muscab: rental $20/month + $200 setup
 *
 * Usage: node scripts/seed-examples.js
 */
import dayjs from 'dayjs';
import { pool } from '../src/config/db.js';
import { generateNumber } from '../src/helpers/numberGenerator.js';
import logger from '../src/utils/logger.js';

const run = async () => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[admin]] = await conn.query(`SELECT user_id FROM users WHERE username = 'admin' LIMIT 1`);
    if (!admin) throw new Error('Admin user not found. Run db:seed first.');

    // Restore member profiles (cleared by reset-data).
    const membersSeed = [
      { fullName: 'Ahmed Muse', phone: '+252 61 111 2233', email: 'ahmed@madalsolutions.com', position: 'Co-Founder' },
      { fullName: 'Hawa Dahir', phone: '+252 61 444 5566', email: 'hawa@madalsolutions.com', position: 'Co-Founder' },
    ];
    for (const m of membersSeed) {
      await conn.query(
        `INSERT INTO members (full_name, phone, email, joined_date, default_monthly_due, position, status)
         SELECT ?, ?, ?, CURDATE() - INTERVAL 300 DAY, 10.00, ?, 'active'
          WHERE NOT EXISTS (
            SELECT 1 FROM members WHERE full_name = ? AND deleted_at IS NULL
          )`,
        [m.fullName, m.phone, m.email, m.position, m.fullName]
      );
    }

    const [[oneTimeType]] = await conn.query(
      `SELECT project_type_id FROM project_types WHERE type_name = 'One Time' LIMIT 1`
    );
    const [[rentalType]] = await conn.query(
      `SELECT project_type_id FROM project_types WHERE type_name = 'Rental' LIMIT 1`
    );

    const today = dayjs().format('YYYY-MM-DD');
    const dueDate = dayjs().add(14, 'day').format('YYYY-MM-DD');

    // --- Feysal: one-time shop website $200 ---
    const feysalCode = 'CUS-001';
    const [feysalResult] = await conn.query(
      `INSERT INTO customers (customer_code, customer_name, company_name, phone, email, city, status)
       VALUES (?, 'Feysal', 'Feysal Shop', '+252 61 000 0001', 'feysal@example.com', 'Mogadishu', 'active')`,
      [feysalCode]
    );
    const feysalId = feysalResult.insertId;

    const [feysalProjectResult] = await conn.query(
      `INSERT INTO projects (customer_id, project_type_id, project_name, description, project_price, start_date, status, created_by)
       VALUES (?, ?, 'Shop Website', 'One-time website build for Feysal shop', 200.00, ?, 'In Progress', ?)`,
      [feysalId, oneTimeType.project_type_id, today, admin.user_id]
    );
    const feysalProjectId = feysalProjectResult.insertId;

    const feysalInvNo = await generateNumber(conn, 'invoices', 'invoice_number', 'INV-');
    await conn.query(
      `INSERT INTO invoices (invoice_number, customer_id, project_id, invoice_date, due_date, subtotal, discount, tax, total_amount, paid_amount, status, created_by)
       VALUES (?, ?, ?, ?, ?, 200.00, 0, 0, 200.00, 0, 'Issued', ?)`,
      [feysalInvNo, feysalId, feysalProjectId, today, dueDate, admin.user_id]
    );
    const [[feysalInv]] = await conn.query(
      `SELECT invoice_id FROM invoices WHERE invoice_number = ?`,
      [feysalInvNo]
    );
    await conn.query(
      `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
       VALUES (?, 'Shop website — full build and delivery', 1, 200.00, 200.00)`,
      [feysalInv.invoice_id]
    );

    // --- Muscab: rental $20/month + $200 setup ---
    const muscabCode = 'CUS-002';
    const [muscabResult] = await conn.query(
      `INSERT INTO customers (customer_code, customer_name, company_name, phone, email, city, status)
       VALUES (?, 'Muscab', 'Muscab Services', '+252 61 000 0002', 'muscab@example.com', 'Mogadishu', 'active')`,
      [muscabCode]
    );
    const muscabId = muscabResult.insertId;

    const [muscabProjectResult] = await conn.query(
      `INSERT INTO projects (customer_id, project_type_id, project_name, description, project_price, start_date, status, created_by)
       VALUES (?, ?, 'Monthly Service', 'Rental service — $20/month', 20.00, ?, 'In Progress', ?)`,
      [muscabId, rentalType.project_type_id, today, admin.user_id]
    );
    const muscabProjectId = muscabProjectResult.insertId;

    const billingDay = 1;
    const nextBilling = dayjs().add(1, 'month').date(billingDay).format('YYYY-MM-DD');

    const [billingResult] = await conn.query(
      `INSERT INTO rental_billings (project_id, monthly_amount, setup_fee, billing_day, next_billing_date, status)
       VALUES (?, 20.00, 200.00, ?, ?, 'Active')`,
      [muscabProjectId, billingDay, nextBilling]
    );
    const billingId = billingResult.insertId;

    const setupInvNo = await generateNumber(conn, 'invoices', 'invoice_number', 'INV-');
    const [setupInvResult] = await conn.query(
      `INSERT INTO invoices (invoice_number, customer_id, project_id, invoice_date, due_date, subtotal, discount, tax, total_amount, paid_amount, status, created_by)
       VALUES (?, ?, ?, ?, ?, 200.00, 0, 0, 200.00, 0, 'Issued', ?)`,
      [setupInvNo, muscabId, muscabProjectId, today, dueDate, admin.user_id]
    );
    const setupInvoiceId = setupInvResult.insertId;
    await conn.query(
      `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
       VALUES (?, 'Setup / installation fee — Monthly Service', 1, 200.00, 200.00)`,
      [setupInvoiceId]
    );
    await conn.query(`UPDATE rental_billings SET setup_invoice_id = ? WHERE billing_id = ?`, [
      setupInvoiceId,
      billingId,
    ]);

    await conn.commit();

    logger.info('Examples seeded:');
    logger.info(`  Feysal (${feysalCode}) — Shop Website $200 → invoice ${feysalInvNo}`);
    logger.info(`  Muscab (${muscabCode}) — Rental $20/mo + setup $200 → invoice ${setupInvNo}`);
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
