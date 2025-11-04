import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { inviteService } from '../services/invite.service';
import { AppError } from '../utils/error-handler.util';

const router = Router();

// Get invite information by token (public route for invite page)
router.get('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const invite = await inviteService.validateInvite(token);

    // Return invite info with group details
    res.json({
      success: true,
      data: {
        group: {
          id: invite.group.id,
          name: invite.group.name,
          description: null, // Group doesn't have description field
          privacy: invite.group.privacy,
        },
        invite: {
          id: invite.id,
          expiresAt: invite.expiresAt,
          createdBy: {
            firstName: invite.creator.displayName || '',
            lastName: '',
          },
        },
        isMember: false, // We'll check this on the frontend after auth
        isExpired: false, // Already validated in validateInvite
      },
    });
  } catch (error) {
    next(error);
  }
});

// Accept invite by token
router.post('/:token/accept', requireAuth, async (req, res, next) => {
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
router.post('/accept-code', requireAuth, async (req, res, next) => {
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