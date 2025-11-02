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

  // T057: GET /api/room/:code/validate → { exists, canJoin, participantCount, gameState }
  // T058: Return 404 with exists:false if room not found
  router.get('/:code/validate', (req: express.Request, res: express.Response) => {
    const code = req.params.code.toUpperCase();
    const validation = roomService.validateRoomCode(code);
    
    if (!validation.exists) {
      return res.status(404).json({ exists: false });
    }
    
    return res.status(200).json(validation);
  });

  app.use('/api/room', router);
}

export default { registerRoomRoutes };
