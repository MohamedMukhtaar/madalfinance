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
      `INSERT IGNORE INTO roles (role_name) VALUES ('Super Admin'), ('Admin')`
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
      { username: 'finance', fullName: 'Safiya Abukar', role: 'Admin', phone: '+252 61 555 0123', email: 'finance@madalsolutions.com' },
    ];

    const passwordHash = await bcrypt.hash('password123', 10);

    for (const u of usersSeed) {
      await conn.query(
        `INSERT INTO users (username, password, full_name, role_id, phone, email, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role_id = VALUES(role_id)`,
        [u.username, passwordHash, u.fullName, roleMap[u.role], u.phone, u.email]
      );
    }

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

    // Business examples are loaded via: npm run db:examples (after db:reset-data)
    // See scripts/seed-examples.js for Feysal (one-time) and Muscab (rental).

    return { roles: roleRows[0].affectedRows, users: usersSeed.length };
  } finally {
    conn.release();
  }
};
