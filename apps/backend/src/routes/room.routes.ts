import express from 'express';
import { roomService } from '../services/room.service';
import { config } from '../config/env';

export function registerRoomRoutes(app: express.Express) {
  const router = express.Router();

  // POST /api/room/create → { code, url }
  router.post('/create', (req: express.Request, res: express.Response) => {
    try {
      const { code } = roomService.createRoom();
      const url = `${config.frontendBaseUrl.replace(/\/$/, '')}/room/${code}`;
      return res.status(201).json({ code, url });
    } catch (err: any) {
      if (err?.message === 'ROOM_LIMIT_REACHED') {
        return res.status(429).json({ error: 'ROOM_LIMIT_REACHED' });
      }
      return res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  app.use('/api/room', router);
}

export default { registerRoomRoutes };
