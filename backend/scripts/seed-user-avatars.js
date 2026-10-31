/**
 * Generate DreamPOS-style initial avatars for every user missing avatar_path.
 * Writes SVG files under uploads/users and updates the users table.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { pool, query } from '../src/config/db.js';
import env from '../src/config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const palette = [
  '#2563eb',
  '#8b5cf6',
  '#06b6d4',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#ef4444',
  '#14b8a6',
  '#101848',
  '#1a255c',
];

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function pickColor(seed) {
  let hash = 0;
  for (const ch of String(seed)) hash = (hash + ch.charCodeAt(0)) % 997;
  return palette[hash % palette.length];
}

function svgAvatar(name, bg) {
  const text = initials(name);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="${bg}"/>
  <text x="64" y="64" dy="0.35em" text-anchor="middle" fill="#ffffff"
        font-family="Inter,Segoe UI,Arial,sans-serif" font-size="48" font-weight="700">${text}</text>
</svg>`;
}

async function main() {
  const uploadsDir = path.join(env.dirs.uploads, 'users');
  fs.mkdirSync(uploadsDir, { recursive: true });

  const rows = await query(
    `SELECT user_id, full_name, avatar_path
       FROM users
      WHERE deleted_at IS NULL
      ORDER BY user_id`
  );

  let created = 0;
  for (const user of rows) {
    if (user.avatar_path) {
      const existing = path.join(uploadsDir, user.avatar_path);
      if (fs.existsSync(existing)) continue;
    }

    const filename = `user-${user.user_id}-${crypto.randomUUID().slice(0, 8)}.svg`;
    const abs = path.join(uploadsDir, filename);
    const bg = pickColor(user.full_name || user.user_id);
    fs.writeFileSync(abs, svgAvatar(user.full_name, bg), 'utf8');

    await query(
      `UPDATE users SET avatar_path = ?, avatar_name = ?, updated_at = now() WHERE user_id = ?`,
      [filename, `${initials(user.full_name)}.svg`, user.user_id]
    );
    created += 1;
    console.log(`avatar → user #${user.user_id} ${user.full_name} (${filename})`);
  }

  console.log(`Done. Created/updated ${created} of ${rows.length} users.`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
