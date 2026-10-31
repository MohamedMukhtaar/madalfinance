import bcrypt from 'bcryptjs';
import { pool } from '../../config/db.js';
import {
  ALL_PERMISSIONS,
  ALL_PERMISSION_NAMES,
  adminPermissionNames,
} from '../../utils/permissions.js';
import { ROLES } from '../../utils/constants.js';

/**
 * Idempotent seed data:
 *  - roles, permissions (Spatie-style), role_has_permissions
 *  - project types, expense catalog, system settings, organization
 *  - admin users + member profiles
 */
export const seed = async () => {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `INSERT INTO roles (role_name, description, is_system) VALUES
         ('Super Admin', 'Full system access', TRUE),
         ('Admin', 'Finance access without user/role administration', TRUE)
       ON CONFLICT (role_name) DO UPDATE
         SET description = EXCLUDED.description,
             is_system = EXCLUDED.is_system,
             updated_at = now()`
    );

    const roleMap = {};
    const [roles] = await conn.query(`SELECT role_id, role_name FROM roles WHERE deleted_at IS NULL`);
    roles.forEach((r) => {
      roleMap[r.role_name] = r.role_id;
    });

    for (const p of ALL_PERMISSIONS) {
      await conn.query(
        `INSERT INTO permissions (permission_name, guard_name, module, action)
         VALUES (?, 'web', ?, ?)
         ON CONFLICT (permission_name, guard_name)
         DO UPDATE SET module = EXCLUDED.module, action = EXCLUDED.action, updated_at = now()`,
        [p.name, p.module, p.action]
      );
    }

    const superId = roleMap[ROLES.SUPER_ADMIN];
    const adminId = roleMap[ROLES.ADMIN];
    if (superId) {
      await conn.query(`DELETE FROM role_has_permissions WHERE role_id = ?`, [superId]);
      await conn.query(
        `INSERT INTO role_has_permissions (permission_id, role_id)
         SELECT permission_id, ? FROM permissions
         ON CONFLICT DO NOTHING`,
        [superId]
      );
    }
    if (adminId) {
      const adminPerms = adminPermissionNames();
      await conn.query(`DELETE FROM role_has_permissions WHERE role_id = ?`, [adminId]);
      await conn.query(
        `INSERT INTO role_has_permissions (permission_id, role_id)
         SELECT permission_id, ?
           FROM permissions
          WHERE permission_name = ANY(?::text[])
         ON CONFLICT DO NOTHING`,
        [adminId, adminPerms]
      );
    }

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

    await conn.query(
      `INSERT INTO organizations (organization_id, name, email, phone, address)
       SELECT 1, company_name, company_email, company_phone, company_address
         FROM settings WHERE setting_id = 1
       ON CONFLICT (organization_id) DO NOTHING`
    );

    const usersSeed = [
      {
        username: 'admin',
        fullName: 'Madal Administrator',
        role: ROLES.SUPER_ADMIN,
        phone: '+252 61 234 5678',
        email: 'admin@madalsolutions.com',
      },
      {
        username: 'finance',
        fullName: 'Safiya Abukar',
        role: ROLES.ADMIN,
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

    return {
      roles: Object.keys(roleMap).length,
      permissions: ALL_PERMISSION_NAMES.length,
      users: usersSeed.length,
    };
  } finally {
    conn.release();
  }
};
