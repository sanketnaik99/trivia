import express from 'express';
import { config } from '../config/env';
import { roomStore } from '../store/room.store';

export function registerHealthRoutes(app: express.Express) {
  const router = express.Router();

  router.get('/', (_req: express.Request, res: express.Response) => {
    res.json({
      status: 'healthy',
      timestamp: Date.now(),
      uptime: process.uptime(),
      rooms: { count: roomStore.getRoomCount(), max: config.maxRooms },
    });
  });

  app.use('/health', router);
}

export default { registerHealthRoutes };
