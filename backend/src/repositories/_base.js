import { query } from '../config/db.js';

/**
 * Runs a prepared-statement query either on the shared pool (when no
 * connection is passed) or inside a transaction (when a connection is).
 * Returns the first result set (rows for SELECT, ResultSetHeader for writes).
 */
export const run = (conn, sql, params = []) => {
  if (conn) {
    return conn.query(sql, params).then(([rows]) => rows);
  }
  return query(sql, params);
};

export default run;
