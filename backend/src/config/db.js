import pg from 'pg';
import env from './index.js';

const { Pool, types } = pg;

/*
 * Driver-level type parsers.
 *
 * The previous MySQL pool ran with `decimalNumbers: true`, so DECIMAL
 * arrived as JavaScript numbers. node-postgres returns NUMERIC as a
 * string; BIGINT (int8) would also stringify COUNT(*) and break
 * Math.ceil on list endpoints. Amounts are DECIMAL(14,2), safely inside
 * the exact range of a JS number.
 *
 * DATE is kept as 'YYYY-MM-DD' so invoice_date / due_date cannot shift
 * a calendar day under a UTC+3 deployment.
 */
types.setTypeParser(types.builtins.NUMERIC, (value) => (value === null ? null : Number(value)));
types.setTypeParser(types.builtins.INT8, (value) => (value === null ? null : Number(value)));
types.setTypeParser(types.builtins.DATE, (value) => value);

const toPgParams = (sql, params = []) => {
  let i = 0;
  const text = String(sql).replace(/\?/g, () => `$${++i}`);
  return { text, values: params };
};

const withReturning = (sql) => {
  const trimmed = String(sql).trim();
  if (/^INSERT\b/i.test(trimmed) && !/\bRETURNING\b/i.test(trimmed)) {
    return `${trimmed.replace(/;?\s*$/, '')} RETURNING *`;
  }
  return sql;
};

const wrapResult = (sql, result) => {
  const isWrite = /^\s*(INSERT|UPDATE|DELETE)\b/i.test(sql);
  if (!isWrite) return result.rows;

  const row = result.rows[0] || {};
  const idKey = Object.keys(row).find((k) => /_id$/i.test(k));
  const header = {
    insertId: idKey ? Number(row[idKey]) : undefined,
    affectedRows: result.rowCount ?? 0,
    rowCount: result.rowCount ?? 0,
  };
  return Object.assign(result.rows, header);
};

const schemaIdent = String(env.db.schema || 'public').replace(/"/g, '""');

/**
 * Shared connection pool. Every query uses parameterized SQL.
 * `?` placeholders are converted to `$1, $2, …` so existing repositories
 * keep working after the MySQL → PostgreSQL switch.
 *
 * search_path is set per connection so unqualified table names resolve
 * to DB_SCHEMA even if the Postgres role has a cluster-wide search_path.
 */
export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  max: env.db.connectionLimit,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  ssl: env.db.ssl ? { rejectUnauthorized: false } : false,
  options: `-c search_path=${schemaIdent}`,
});

const origConnect = pool.connect.bind(pool);
const applySearchPath = (client) => client.query(`SET search_path TO "${schemaIdent}"`);

/** Preserve pg's callback-style connect. A Promise-only wrap made Pool.query hang. */
pool.connect = (cb) => {
  if (typeof cb === 'function') {
    origConnect((err, client, done) => {
      if (err) return cb(err);
      applySearchPath(client)
        .then(() => cb(null, client, done))
        .catch((e) => {
          try {
            done(e);
          } catch {
            /* ignore */
          }
          cb(e);
        });
    });
    return undefined;
  }
  return origConnect().then(async (client) => {
    await applySearchPath(client);
    return client;
  });
};

const origPoolQuery = pool.query.bind(pool);

const execOn = async (sql, params = []) => {
  const prepared = withReturning(sql);
  const { text, values } = toPgParams(prepared, params);
  const result = await origPoolQuery(text, values);
  return wrapResult(sql, result);
};

const wrapClient = (client) => {
  const origQuery = client.query.bind(client);
  const wrapped = {
    query: async (sql, params = []) => {
      const prepared = withReturning(sql);
      const { text, values } = toPgParams(prepared, params);
      const result = await origQuery(text, values);
      return [wrapResult(sql, result)];
    },
    release: (...args) => client.release(...args),
    beginTransaction: () => origQuery('BEGIN'),
    commit: () => origQuery('COMMIT'),
    rollback: () => origQuery('ROLLBACK'),
  };
  return wrapped;
};

pool.getConnection = async () => wrapClient(await pool.connect());

/** mysql2-compatible: returns `[rows]` / `[header]`. */
pool.query = async (sql, params = []) => [await execOn(sql, params ?? [])];

/**
 * Prepared-statement query helper.
 * SELECT → row array. INSERT/UPDATE/DELETE → mysql-compatible header
 * (`insertId`, `affectedRows`) that is also an array of RETURNING rows.
 */
export const query = async (sql, params = []) => execOn(sql, params);

/**
 * Run multiple statements inside a single DB transaction.
 *
 * @template T
 * @param {(conn: { query: Function }) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export const withTransaction = async (fn) => {
  const client = await pool.connect();
  const conn = wrapClient(client);
  try {
    await client.query('BEGIN');
    const result = await fn(conn);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore rollback errors */
    }
    throw err;
  } finally {
    client.release();
  }
};

export const testConnection = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
};

export default pool;
