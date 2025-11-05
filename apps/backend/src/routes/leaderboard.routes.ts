import { Router, Request, Response } from 'express';
import { leaderboardService } from '../services/leaderboard.service';
import { membershipService } from '../services/membership.service';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../utils/error-handler.util';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get group leaderboard
router.get('/groups/:groupId/leaderboard', asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const {
    page = '1',
    limit = '50',
    sortBy = 'totalPoints',
    order = 'desc'
  } = req.query;
  const userId = req.userId!;

  // Verify user is an active member of the group
  const isMember = await membershipService.checkActiveMembership(groupId, userId);
  if (!isMember) {
    throw new AppError('FORBIDDEN', 'You must be a member of this group to view the leaderboard', 403);
  }

  // Validate and parse parameters
  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const validSortBy = ['totalPoints', 'lastUpdated'].includes(sortBy as string) ? sortBy as 'totalPoints' | 'lastUpdated' : 'totalPoints';
  const validOrder = ['asc', 'desc'].includes(order as string) ? order as 'asc' | 'desc' : 'desc';

  const result = await leaderboardService.getGroupLeaderboard(groupId, {
    page: pageNum,
    limit: limitNum,
    sortBy: validSortBy,
    order: validOrder,
  });

  res.json({
    success: true,
    data: result,
  });
}));

export default router;