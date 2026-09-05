import bcrypt from 'bcryptjs';
import { pool } from '../../config/db.js';

/**
 * Idempotent seed data:
 *  - roles, project types, expense catalog
 *  - system settings
 *  - admin users + member profiles
 */
export const seed = async () => {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `INSERT INTO roles (role_name) VALUES ('Super Admin'), ('Admin')
       ON CONFLICT (role_name) DO NOTHING`
    );
    const roleMap = {};
    const [roles] = await conn.query(`SELECT role_id, role_name FROM roles`);
    roles.forEach((r) => {
      roleMap[r.role_name] = r.role_id;
    });

    await conn.query(
      `INSERT INTO project_types (type_name) VALUES ('One Time'), ('Rental')
       ON CONFLICT (type_name) DO NOTHING`
    );

    const expenseCatalog = [
      ['EXP-HOST', 'Hosting'],
      ['EXP-DOM', 'Domain'],
      ['EXP-NET', 'Internet'],
      ['EXP-TRN', 'Transport'],
      ['EXP-MKT', 'Marketing'],
      ['EXP-OFF', 'Office'],
      ['EXP-SFT', 'Software'],
      ['EXP-EQP', 'Equipment'],
      ['EXP-SAL', 'Salary'],
      ['EXP-UTL', 'Utilities'],
      ['EXP-OTH', 'Other'],
    ];
    for (const [code, name] of expenseCatalog) {
      await conn.query(
        `INSERT INTO expenses (expense_code, expense_name) VALUES (?, ?)
         ON CONFLICT (expense_name) DO NOTHING`,
        [code, name]
      );
    }

    await conn.query(
      `INSERT INTO settings (setting_id, company_name, currency, default_member_due, timezone)
       VALUES (1, 'Madal ICT Solutions', '$', 10.00, 'Africa/Mogadishu')
       ON CONFLICT (setting_id) DO NOTHING`
    );

    const usersSeed = [
      {
        username: 'admin',
        fullName: 'Madal Administrator',
        role: 'Super Admin',
        phone: '+252 61 234 5678',
        email: 'admin@madalsolutions.com',
      },
      {
        username: 'finance',
        fullName: 'Safiya Abukar',
        role: 'Admin',
        phone: '+252 61 555 0123',
        email: 'finance@madalsolutions.com',
      },
    ];

    const passwordHash = await bcrypt.hash('password123', 10);

    for (const u of usersSeed) {
      await conn.query(
        `INSERT INTO users (username, password_hash, full_name, role_id, phone, email, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')
         ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name, role_id = EXCLUDED.role_id`,
        [u.username, passwordHash, u.fullName, roleMap[u.role], u.phone, u.email]
      );
    }

    const membersSeed = [
      { code: 'MEM-0001', fullName: 'Ahmed Muse', phone: '+252 61 111 2233', email: 'ahmed@madalsolutions.com', position: 'Co-Founder' },
      { code: 'MEM-0002', fullName: 'Hawa Dahir', phone: '+252 61 444 5566', email: 'hawa@madalsolutions.com', position: 'Co-Founder' },
    ];

    for (const m of membersSeed) {
      await conn.query(
        `INSERT INTO members (member_code, full_name, phone, email, joined_date, default_monthly_due, position, status)
         SELECT ?, ?, ?, ?, CURRENT_DATE - INTERVAL '300 days', 10.00, ?, 'active'
          WHERE NOT EXISTS (
            SELECT 1 FROM members WHERE full_name = ? AND deleted_at IS NULL
          )`,
        [m.code, m.fullName, m.phone, m.email, m.position, m.fullName]
      );
    }

    const [existingAccounts] = await conn.query(`SELECT account_id FROM accounts LIMIT 1`);
    if (!existingAccounts.length) {
      await conn.query(
        `INSERT INTO accounts (account_name, account_type, account_number, opening_balance, balance, is_default)
         VALUES ('Cash on Hand', 'Cash', 'CASH-001', 0, 0, TRUE)`
      );
    }

    return { roles: Object.keys(roleMap).length, users: usersSeed.length };
  } finally {
    conn.release();
  }
};
