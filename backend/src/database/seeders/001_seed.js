import bcrypt from 'bcryptjs';
import { pool } from '../../config/db.js';

/**
 * Idempotent seed data:
 *  - reference tables (roles, project types, income/expense categories)
 *  - system settings
 *  - the four internal users + their member profiles
 *  - a small set of demo customers/projects/invoices only when the DB is empty
 */
export const seed = async () => {
  const conn = await pool.getConnection();
  try {
    const roleRows = await conn.query(
      `INSERT IGNORE INTO roles (role_name) VALUES ('Super Admin'), ('Finance Admin'), ('Member')`
    );
    const roleMap = {};
    const [roles] = await conn.query(`SELECT role_id, role_name FROM roles`);
    roles.forEach((r) => {
      roleMap[r.role_name] = r.role_id;
    });

    await conn.query(`INSERT IGNORE INTO project_types (type_name) VALUES ('One Time'), ('Rental')`);
    await conn.query(`INSERT IGNORE INTO income_categories (category_name) VALUES
      ('Rental'), ('Project'), ('Hosting'), ('Maintenance'), ('Consultation'), ('Training'), ('Donation'), ('Other')`);
    await conn.query(`INSERT IGNORE INTO expense_categories (category_name) VALUES
      ('Hosting'), ('Domain'), ('Internet'), ('Transport'), ('Marketing'),
      ('Office'), ('Software'), ('Equipment'), ('Salary'), ('Utilities'), ('Other')`);

    await conn.query(`INSERT INTO settings (company_name, currency, default_member_due, timezone)
      VALUES ('Madal ICT Solutions', '$', 10.00, 'Africa/Mogadishu')
      ON DUPLICATE KEY UPDATE setting_id = setting_id`);

    const usersSeed = [
      { username: 'admin', fullName: 'Madal Administrator', role: 'Super Admin', phone: '+252 61 234 5678', email: 'admin@madalsolutions.com' },
      { username: 'finance', fullName: 'Safiya Abukar', role: 'Finance Admin', phone: '+252 61 555 0123', email: 'finance@madalsolutions.com' },
      { username: 'ahmed', fullName: 'Ahmed Muse', role: 'Member', phone: '+252 61 111 2233', email: 'ahmed@madalsolutions.com' },
      { username: 'hawa', fullName: 'Hawa Dahir', role: 'Member', phone: '+252 61 444 5566', email: 'hawa@madalsolutions.com' },
    ];

    const passwordHash = await bcrypt.hash('password123', 10);
    const memberUserIds = [];

    for (const u of usersSeed) {
      await conn.query(
        `INSERT INTO users (username, password, full_name, role_id, phone, email, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role_id = VALUES(role_id)`,
        [u.username, passwordHash, u.fullName, roleMap[u.role], u.phone, u.email]
      );
      const [[row]] = await conn.query(`SELECT user_id FROM users WHERE username = ?`, [u.username]);
      if (u.role === 'Member') memberUserIds.push(row.user_id);
    }

    for (const userId of memberUserIds) {
      await conn.query(
        `INSERT IGNORE INTO members (user_id, joined_date, default_monthly_due, position, status)
         VALUES (?, CURDATE() - INTERVAL 300 DAY, 10.00, 'Co-Founder', 'active')`,
        [userId]
      );
    }

    // Demo data — only when the customers table is empty.
    const [[customerCount]] = await conn.query(`SELECT COUNT(*) AS c FROM customers`);
    if (customerCount.c === 0) {
      const customerNames = [
        ['CUST-1001', 'SomaliNet Telecom', 'Mohamed Ali', 'Hodan, Mogadishu'],
        ['CUST-1002', 'Hormuud Solutions', 'Amina Hassan', 'Wadajir, Mogadishu'],
        ['CUST-1003', 'GlobalLink Ltd', 'Abdi Yusuf', 'Hargeisa'],
        ['CUST-1004', 'Telesom Group', 'Fadumo Omar', 'Garowe'],
      ];
      const [[admin]] = await conn.query(`SELECT user_id FROM users WHERE username = 'admin'`);
      const [[oneTimeType]] = await conn.query(`SELECT project_type_id FROM project_types WHERE type_name = 'One Time'`);
      const [[rentalType]] = await conn.query(`SELECT project_type_id FROM project_types WHERE type_name = 'Rental'`);

      const customerIds = [];
      for (const [code, company, name, city] of customerNames) {
        const r = await conn.query(
          `INSERT INTO customers (customer_code, customer_name, company_name, city, status)
           VALUES (?, ?, ?, ?, 'active')`,
          [code, name, company, city]
        );
        customerIds.push(r[0].insertId);
      }

      // One one-time project + one rental project for the first customer.
      const p1 = await conn.query(
        `INSERT INTO projects (customer_id, project_type_id, project_name, description, project_price, start_date, status, created_by)
         VALUES (?, ?, 'Corporate Website', 'Full website build and deployment', 4500.00, CURDATE() - INTERVAL 45 DAY, 'In Progress', ?)`,
        [customerIds[0], oneTimeType.project_type_id, admin.user_id]
      );
      await conn.query(
        `INSERT INTO invoices (invoice_number, customer_id, project_id, invoice_date, due_date, subtotal, discount, tax, total_amount, paid_amount, status, created_by)
         VALUES ('INV-000001', ?, ?, CURDATE() - INTERVAL 30 DAY, CURDATE() + INTERVAL 15 DAY, 4500.00, 0, 0, 4500.00, 1000.00, 'Partial', ?)`,
        [customerIds[0], p1[0].insertId, admin.user_id]
      );

      const p2 = await conn.query(
        `INSERT INTO projects (customer_id, project_type_id, project_name, description, project_price, start_date, status, created_by)
         VALUES (?, ?, 'Web Hosting Package', 'Monthly managed hosting', 40.00, CURDATE() - INTERVAL 20 DAY, 'In Progress', ?)`,
        [customerIds[1], rentalType.project_type_id, admin.user_id]
      );
      await conn.query(
        `INSERT INTO rental_billings (project_id, monthly_amount, billing_day, next_billing_date, status)
         VALUES (?, 40.00, 1, DATE_FORMAT(CURDATE() + INTERVAL 1 MONTH, '%Y-%m-01'), 'Active')`,
        [p2[0].insertId]
      );
    }

    return { roles: roleRows[0].affectedRows, users: usersSeed.length };
  } finally {
    conn.release();
  }
};
