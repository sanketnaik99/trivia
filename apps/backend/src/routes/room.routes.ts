import express from 'express';
import { roomService } from '../services/room.service';
import { config } from '../config/env';
import { requireAuth } from '../middleware/auth.middleware';

export function registerRoomRoutes(app: express.Express) {
  const router = express.Router();

  // T080: Simple in-memory rate limiter per IP for room creation
  // Limit: max 5 create requests per minute per IP
  const createLimits = new Map<string, number[]>();
  const RATE_LIMIT_WINDOW_MS = 60_000;
  const RATE_LIMIT_MAX = 5;

  function rateLimitCreate(req: express.Request, res: express.Response, next: express.NextFunction) {
    const ip = (req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').toString();
    const now = Date.now();
    const arr = createLimits.get(ip) || [];
    // drop old entries
    const recent = arr.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'RATE_LIMITED', message: 'Too many room creation requests. Please wait a minute.' });
    }
    recent.push(now);
    createLimits.set(ip, recent);
    next();
  }

  // POST /api/room/create → { code, url }
  router.post('/create', rateLimitCreate, async (req: express.Request, res: express.Response) => {
    try {
      const { groupId } = req.body as { groupId?: string };

      let userId: string | undefined;
      if (groupId) {
        // Require auth for group rooms
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required for group rooms' });
        }
        try {
          const { clerkClient } = await import('@clerk/clerk-sdk-node');
          const sessionClaims = await clerkClient.verifyToken(token);
          userId = sessionClaims.sub;
        } catch (err) {
          return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid token' });
        }
      }

      const { code } = await roomService.createRoom(userId || '', groupId);
      const url = `${config.frontendBaseUrl.replace(/\/$/, '')}/room/${code}`;
      return res.status(201).json({ code, url });
    } catch (err: unknown) {
      const e = err as Error;
      if (e?.message === 'ROOM_LIMIT_REACHED') {
        return res.status(429).json({ error: 'ROOM_LIMIT_REACHED' });
      }
      if (e?.message === 'USER_NOT_GROUP_MEMBER') {
        return res.status(403).json({ error: 'USER_NOT_GROUP_MEMBER' });
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
