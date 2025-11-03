import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { inviteService } from '../services/invite.service';
import { AppError } from '../utils/error-handler.util';

const router = Router();

// Rate limiting for invite generation (simple in-memory implementation)
const inviteRateLimit = new Map<string, { count: number; resetTime: number }>();
const MAX_INVITES_PER_HOUR = 10;
const HOUR_MS = 60 * 60 * 1000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = inviteRateLimit.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    inviteRateLimit.set(userId, { count: 1, resetTime: now + HOUR_MS });
    return true;
  }

  if (userLimit.count >= MAX_INVITES_PER_HOUR) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Generate invite for group
router.post('/groups/:groupId/invites', requireAuth, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { expiresInDays = 7 } = req.body;
    const userId = req.userId!;

    // Check rate limit
    if (!checkRateLimit(userId)) {
      throw new AppError('RATE_LIMITED', 'Too many invites generated. Please wait before creating more.', 429);
    }

    const result = await inviteService.generateInvite({
      groupId,
      createdBy: userId,
      expiresInDays,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Get invites for group
router.get('/groups/:groupId/invites', requireAuth, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { status } = req.query;
    const userId = req.userId!;

    const invites = await inviteService.getGroupInvites(
      groupId,
      userId,
      status as 'ACTIVE' | 'USED' | 'REVOKED' | 'EXPIRED' | undefined
    );

    res.json({
      success: true,
      data: invites,
    });
  } catch (error) {
    next(error);
  }
});

// Revoke invite
router.post('/invites/:inviteId/revoke', requireAuth, async (req, res, next) => {
  try {
    const { inviteId } = req.params;
    const userId = req.userId!;

    const invite = await inviteService.revokeInvite(inviteId, userId);

    res.json({
      success: true,
      data: invite,
    });
  } catch (error) {
    next(error);
  }
});

// Accept invite by token
router.post('/invites/:token/accept', requireAuth, async (req, res, next) => {
  try {
    const { token } = req.params;
    const userId = req.userId!;

    const result = await inviteService.acceptInvite(token, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Accept invite by code
router.post('/invites/accept-code', requireAuth, async (req, res, next) => {
  try {
    const { code } = req.body;
    const userId = req.userId!;

    if (!code) {
      throw new AppError('VALIDATION_ERROR', 'Invite code is required', 400);
    }

    const result = await inviteService.acceptInviteByCode(code, userId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;