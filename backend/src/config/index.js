import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const parseBool = (v) => v === 'true' || v === '1';
const parseNum = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: parseNum(process.env.PORT, 4000),

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseNum(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'finance_system',
    connectionLimit: parseNum(process.env.DB_CONNECTION_LIMIT, 10),
  },

  jwt: {
    accessSecret: process.env.ACCESS_TOKEN_SECRET,
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
    accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshExpiresDays: parseNum(process.env.REFRESH_TOKEN_EXPIRES_DAYS, 7),
  },

  cors: {
    clientOrigin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseNum(process.env.SMTP_PORT, 587),
    secure: parseBool(process.env.SMTP_SECURE),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Madal ICT Solutions <no-reply@madal.local>',
  },

  uploads: {
    maxFileSizeMb: parseNum(process.env.MAX_FILE_SIZE_MB, 10),
  },

  cron: {
    rentalBilling: process.env.RENTAL_BILLING_CRON || '5 0 * * *',
    overdueCheck: process.env.OVERDUE_CHECK_CRON || '30 0 * * *',
    monthlyDues: process.env.MONTHLY_DUES_CRON || '0 1 1 * *',
    reportCache: process.env.REPORT_CACHE_CRON || '45 0 * * *',
    rentalDueDays: parseNum(process.env.RENTAL_DUE_DAYS, 7),
  },

  dirs: {
    root: path.resolve(__dirname, '../..'),
    src: path.resolve(__dirname, '..'),
    uploads: path.resolve(__dirname, '../uploads'),
    reports: path.resolve(__dirname, '../reports'),
    logs: path.resolve(__dirname, '../logs'),
  },
};

export default env;
