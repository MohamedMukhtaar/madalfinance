import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import config from './config/index.js';
import logger from './utils/logger.js';
import routes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { multerErrorHandler } from './middleware/upload.js';
import { apiLimiter } from './middleware/rateLimiters.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin(origin, cb) {
      const allowed = config.cors.clientOrigin;
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      if (!config.isProduction) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

app.use('/api', apiLimiter);

// Uploads/reports are only available via authenticated /api/files routes.
app.use('/api', routes);

app.use(multerErrorHandler);
app.use(notFound);
app.use(errorHandler);

export default app;
