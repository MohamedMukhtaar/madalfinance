import fs from 'node:fs';
import path from 'node:path';
import env from '../config/index.js';

const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const pad = (n) => String(n).padStart(2, '0');
const ts = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

class Logger {
  constructor() {
    this.dir = env.dirs.logs;
    ensureDir(this.dir);
    this.file = path.join(this.dir, env.isProduction ? 'app.log' : 'app-dev.log');
  }

  write(level, ...args) {
    if (levels[level] > (env.isProduction ? levels.info : levels.debug)) return;
    const msg = args
      .map((a) => (a instanceof Error ? a.stack || a.message : typeof a === 'object' ? JSON.stringify(a) : a))
      .join(' ');
    const line = `[${ts()}] [${level.toUpperCase()}] ${msg}`;
    if (env.nodeEnv !== 'test') {
      if (level === 'error') console.error(line);
      else console.log(line);
    }
    try {
      fs.appendFileSync(this.file, `${line}\n`);
    } catch {
      /* never let logging crash the app */
    }
  }

  debug(...args) {
    this.write('debug', ...args);
  }
  info(...args) {
    this.write('info', ...args);
  }
  warn(...args) {
    this.write('warn', ...args);
  }
  error(...args) {
    this.write('error', ...args);
  }
  http(...args) {
    this.write('http', ...args);
  }
}

export default new Logger();
