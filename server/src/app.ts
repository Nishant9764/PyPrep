import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config';
import { originCheck } from './middleware/auth';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { contentRouter } from './routes/content';
import { practiceRouter } from './routes/practice';
import { progressRouter } from './routes/progress';
import { runnerHealthy } from './services/runnerClient';
import { errorHandler } from './utils/http';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use(helmet());
  app.use(cors({ origin: config.clientOrigins, credentials: true }));
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use('/api', originCheck);

  app.get('/api/health', async (_req, res) => {
    res.json({ ok: true, runner: await runnerHealthy() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  // Learning content and learner state, all scoped by track so new tracks need no new routes.
  app.use('/api/tracks', contentRouter);
  app.use('/api/tracks', practiceRouter);
  app.use('/api/tracks', progressRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  });
  app.use(errorHandler);
  return app;
}
