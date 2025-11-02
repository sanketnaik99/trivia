import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { logger } from './utils/logger.util';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(
    cors({
      origin: (origin: any, cb: (err: any, allow?: boolean) => void) => {
        // allow requests with no origin (e.g., curl)
        if (!origin) return cb(null, true);
        if (config.allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  app.get('/health', (req: express.Request, res: express.Response) => {
    res.json({ status: 'healthy', timestamp: Date.now(), uptime: process.uptime(), rooms: { count: 0, max: config.maxRooms } });
  });

  // placeholder for route registration (routes/index.ts will mount later)
  app.get('/', (req: express.Request, res: express.Response) => {
    res.json({ ok: true });
  });

  logger.info('Express app created', { env: config.nodeEnv });

  return app;
}
