import express from 'express';
import { leaderboardService, LeaderboardResult } from '../services/leaderboard.service';
import { logger } from '../utils/logger.util';

export function registerInternalRoutes(app: express.Express) {
  const router = express.Router();

  // Simple service token auth middleware
  const requireServiceToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;

    if (!expectedToken) {
      logger.error('INTERNAL_SERVICE_TOKEN not configured');
      return res.status(500).json({ error: 'SERVICE_CONFIGURATION_ERROR' });
    }

    if (!token || token !== expectedToken) {
      return res.status(401).json({ error: 'INVALID_SERVICE_TOKEN' });
    }

    next();
  };

  // POST /api/internal/leaderboard/update
  router.post('/leaderboard/update', requireServiceToken, async (req: express.Request, res: express.Response) => {
    try {
      const { groupId, roomCode, results } = req.body as {
        groupId: string;
        roomCode: string;
        results: LeaderboardResult[];
      };

      if (!groupId || !roomCode || !Array.isArray(results)) {
        return res.status(400).json({ error: 'INVALID_REQUEST', message: 'groupId, roomCode, and results array required' });
      }

      await leaderboardService.updateGroupLeaderboard(groupId, roomCode, results);

      return res.status(200).json({ success: true });
    } catch (err: unknown) {
      const e = err as Error;
      logger.error('Leaderboard update failed', { error: e.message });
      return res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  app.use('/api/internal', router);
}

export default { registerInternalRoutes };