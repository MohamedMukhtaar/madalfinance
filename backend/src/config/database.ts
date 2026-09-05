import { Sequelize } from 'sequelize';
import pg from 'pg';
import env from './index.js';
import logger from '../utils/logger.js';

/*
 * Driver-level type parsers.
 *
 * The previous MySQL pool ran with `decimalNumbers: true`, so DECIMAL columns
 * arrived as JavaScript numbers. node-postgres returns NUMERIC as a string to
 * protect precision, which would turn every money value in the API into text
 * and break arithmetic silently. BIGINT gets the same treatment because
 * COUNT(*) comes back as int8 and every list endpoint feeds it to Math.ceil.
 *
 * Amounts here are DECIMAL(14,2) at the widest, far inside the range a double
 * represents exactly, so Number() is safe for this schema.
 */
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => (value === null ? null : Number(value)));
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => (value === null ? null : Number(value)));

/*
 * Timestamps are deliberately left as JavaScript Date objects here rather than
 * forced back into strings at the driver. Application code benefits from real
 * Dates, and the API boundary converts them once in utils/serialize.ts so the
 * JSON keeps the exact 'YYYY-MM-DD HH:mm:ss' shape the frontend already parses.
 *
 * Calendar dates use Sequelize's DATEONLY, which stays a 'YYYY-MM-DD' string
 * end to end. That avoids the timezone shift that would otherwise move
 * invoice_date and due_date by a day in a UTC+3 deployment.
 */

export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: env.db.host,
  port: env.db.port,
  username: env.db.user,
  password: env.db.password,
  database: env.db.name,
  schema: env.db.schema,
  logging: env.db.logging ? (msg: string) => logger.debug(msg) : false,
  pool: {
    max: env.db.connectionLimit,
    min: 0,
    acquire: 30_000,
    idle: 10_000,
  },
  dialectOptions: {
    ...(env.db.ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {}),
    // Fail fast instead of hanging a request behind a stuck lock.
    statement_timeout: 30_000,
  },
  define: {
    // The schema uses snake_case throughout and manages its own
    // created_at / updated_at columns per table, so Sequelize's automatic
    // timestamp handling is opted into per model rather than globally.
    underscored: true,
    freezeTableName: true,
    timestamps: false,
  },
});

export const testConnection = async (): Promise<void> => {
  await sequelize.authenticate();
};

export default sequelize;
