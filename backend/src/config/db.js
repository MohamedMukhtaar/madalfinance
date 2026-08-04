import mysql from 'mysql2/promise';
import env from './index.js';

/**
 * Shared connection pool. Every query uses prepared statements
 * (parameterized SQL) which prevents SQL injection.
 */
export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  decimalNumbers: true,
  dateStrings: true,
  timezone: 'Z',
  enableKeepAlive: true,
});

/**
 * Simple prepared-statement query helper.
 * @param {string} sql
 * @param {unknown[]} [params]
 * @returns {Promise<mysql.RowDataPacket[]>}
 */
export const query = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};

/**
 * Run multiple statements inside a single DB transaction.
 * Pass the connection to repositories so all writes share one tx.
 *
 * @template T
 * @param {(conn: mysql.PoolConnection) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export const withTransaction = async (fn) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const testConnection = async () => {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
};

export default pool;
