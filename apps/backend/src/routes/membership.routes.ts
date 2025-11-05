import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../config/prisma';
import { AppError } from '../utils/error-handler.util';

const router = Router();

// Leave group
router.post('/groups/:groupId/leave', requireAuth, async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId!;

    // Check if user is a member
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new AppError('NOT_FOUND', 'You are not an active member of this group', 404);
    }

    // Check if user is the last admin
    if (membership.role === 'ADMIN') {
      const adminCount = await prisma.membership.count({
        where: {
          groupId,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      if (adminCount <= 1) {
        throw new AppError('FORBIDDEN', 'Cannot leave group as the last admin. Promote another member first.', 403);
      }
    }

    // Update membership status to LEFT
    const updatedMembership = await prisma.membership.update({
      where: {
        userId_groupId: { userId, groupId },
      },
      data: {
        status: 'LEFT',
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updatedMembership,
    });
  } catch (error) {
    next(error);
  }
});

// Remove member (admin only)
router.post('/groups/:groupId/members/:userId/remove', requireAuth, async (req, res, next) => {
  try {
    const { groupId, userId: targetUserId } = req.params;
    const adminUserId = req.userId!;

    // Check if admin is actually an admin
    const adminMembership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId: adminUserId, groupId },
      },
    });

    if (!adminMembership || adminMembership.role !== 'ADMIN' || adminMembership.status !== 'ACTIVE') {
      throw new AppError('FORBIDDEN', 'Only group admins can remove members', 403);
    }

    // Check if target user is a member
    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId: targetUserId, groupId },
      },
    });

    if (!targetMembership || targetMembership.status !== 'ACTIVE') {
      throw new AppError('NOT_FOUND', 'User is not an active member of this group', 404);
    }

    // Prevent removing other admins
    if (targetMembership.role === 'ADMIN') {
      throw new AppError('FORBIDDEN', 'Cannot remove other admins from the group', 403);
    }

    // Prevent self-removal (should use leave endpoint instead)
    if (targetUserId === adminUserId) {
      throw new AppError('VALIDATION_ERROR', 'Use the leave endpoint to leave the group yourself', 400);
    }

    // Update membership status to REMOVED
    const updatedMembership = await prisma.membership.update({
      where: {
        userId_groupId: { userId: targetUserId, groupId },
      },
      data: {
        status: 'REMOVED',
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updatedMembership,
    });
  } catch (error) {
    next(error);
  }
});

// Promote member to admin (admin only)
router.post('/groups/:groupId/members/:userId/promote', requireAuth, async (req, res, next) => {
  try {
    const { groupId, userId: targetUserId } = req.params;
    const adminUserId = req.userId!;

    // Check if admin is actually an admin
    const adminMembership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId: adminUserId, groupId },
      },
    });

    if (!adminMembership || adminMembership.role !== 'ADMIN' || adminMembership.status !== 'ACTIVE') {
      throw new AppError('FORBIDDEN', 'Only group admins can promote members', 403);
    }

    // Check if target user is a member
    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId: targetUserId, groupId },
      },
    });

    if (!targetMembership || targetMembership.status !== 'ACTIVE') {
      throw new AppError('NOT_FOUND', 'User is not an active member of this group', 404);
    }

    // Check if already an admin
    if (targetMembership.role === 'ADMIN') {
      throw new AppError('CONFLICT', 'User is already an admin', 409);
    }

    // Update role to ADMIN
    const updatedMembership = await prisma.membership.update({
      where: {
        userId_groupId: { userId: targetUserId, groupId },
      },
      data: {
        role: 'ADMIN',
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: updatedMembership,
    });
  } catch (error) {
    next(error);
  }
});

export default router;