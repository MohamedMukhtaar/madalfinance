import bcrypt from 'bcryptjs';
import { pool } from '../src/config/db.js';

const username = process.argv[2] || 'admin';
const password = process.argv[3] || 'password123';

const hash = await bcrypt.hash(password, 10);
const [result] = await pool.query(
  `UPDATE users SET password = ?, status = 'active', deleted_at = NULL WHERE username = ?`,
  [hash, username]
);

if (result.affectedRows === 0) {
  console.error(`No user found with username "${username}"`);
  process.exit(1);
}

console.log(`Password reset for "${username}"`);
await pool.end();
