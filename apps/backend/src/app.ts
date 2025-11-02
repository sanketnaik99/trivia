import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { logger } from './utils/logger.util';
import { registerRoutes } from './routes';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(
    cors({
      origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
        // allow requests with no origin (e.g., curl)
        if (!origin) return cb(null, true);
        if (config.allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  // placeholder root
  app.get('/', (req: express.Request, res: express.Response) => {
    res.json({ ok: true });
  });

  // Register feature routes
  registerRoutes(app);

  logger.info('Express app created', { env: config.nodeEnv });

  return app;
}
