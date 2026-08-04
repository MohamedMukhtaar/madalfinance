import http from 'node:http';
import app from './app.js';
import config from './config/index.js';
import logger from './utils/logger.js';
import { testConnection } from './config/db.js';
import { initSocket } from './config/socket.js';
import { startJobs } from './jobs/index.js';

const start = async () => {
  if (!config.jwt.accessSecret || config.jwt.accessSecret.length < 16) {
    logger.error('ACCESS_TOKEN_SECRET is missing or too short. Set a strong secret in .env');
    process.exit(1);
  }

  try {
    await testConnection();
    logger.info('Database connection verified');
  } catch (err) {
    logger.error(`Database connection failed: ${err.message}`);
    process.exit(1);
  }

  const server = http.createServer(app);
  initSocket(server);

  server.listen(config.port, () => {
    logger.info(`Finance system API listening on http://localhost:${config.port} (${config.nodeEnv})`);
  });

  startJobs();

  const shutdown = () => {
    logger.info('Shutting down gracefully...');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start().catch((err) => {
  logger.error(`Fatal startup error: ${err.stack || err.message}`);
  process.exit(1);
});
