import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { fileURLToPath, pathToFileURL } from 'node:url';
import env from '../config/index.js';
import { pool } from '../config/db.js';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const SEEDERS_DIR = path.join(__dirname, 'seeders');

/** Raw bootstrap connection (no database selected yet). */
const bootstrap = () =>
  mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

/** Connection bound to the finance database. */
const appConn = () =>
  mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    multipleStatements: true,
  });

const listFiles = (dir, ext) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(ext)).sort()
    : [];

export const migrate = async () => {
  const conn = await bootstrap();
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS ${env.db.name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.changeUser({ database: env.db.name });
    await conn.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    );

    const [applied] = await conn.query(`SELECT filename FROM schema_migrations`);
    const done = new Set(applied.map((r) => r.filename));

    for (const file of listFiles(MIGRATIONS_DIR, '.sql')) {
      if (done.has(file)) {
        logger.info(`SKIP ${file} (already applied)`);
        continue;
      }
      logger.info(`Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await conn.query(sql);
      await conn.query(`INSERT INTO schema_migrations (filename) VALUES (?)`, [file]);
      logger.info(`Applied ${file}`);
    }
  } finally {
    await conn.end();
  }
};

const importSeeder = async (file) => {
  const modulePath = path.join(SEEDERS_DIR, file);
  const mod = await import(`${pathToFileURL(modulePath).href}?t=${Date.now()}`);
  return mod.seed || mod.default;
};

export const seed = async () => {
  const conn = await bootstrap();
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS ${env.db.name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await conn.end();
  }

  const conn2 = await appConn();
  try {
    for (const file of listFiles(SEEDERS_DIR, '.js')) {
      logger.info(`Running seeder: ${file}`);
      const seedFn = await importSeeder(file);
      const result = await seedFn();
      logger.info(`Seeded ${file} -> ${JSON.stringify(result)}`);
    }
  } finally {
    await conn2.end();
    await pool.end();
  }
};

const command = process.argv[2] || 'migrate';

if (command === 'migrate') {
  migrate().then(() => logger.info('Migration complete')).catch((e) => {
    logger.error(e);
    process.exit(1);
  });
} else if (command === 'seed') {
  seed().then(() => logger.info('Seeding complete')).catch((e) => {
    logger.error(e);
    process.exit(1);
  });
} else if (command === 'init') {
  migrate()
    .then(() => seed())
    .then(() => logger.info('Database initialized'))
    .catch((e) => {
      logger.error(e);
      process.exit(1);
    });
} else {
  logger.error(`Unknown command: ${command} (expected migrate | seed | init)`);
  process.exit(1);
}
