import { Router, Request, Response } from 'express';
import { groupService } from '../services/group.service';
import { membershipService } from '../services/membership.service';
import { inviteService } from '../services/invite.service';
import { roomService } from '../services/room.service';
import { scheduledGameService } from '../services/scheduled-game.service';
import { generateIcsForScheduledGame, generateGoogleCalendarLink } from '../utils/calendar.util';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../utils/error-handler.util';
import prisma from '../config/prisma';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Create a new group
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  const userId = req.userId!;

  const group = await groupService.createGroup({
    name,
    createdBy: userId,
  });

  res.status(201).json({
    success: true,
    data: group,
  });
}));

// Get user's groups
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  const groups = await groupService.getUserGroups(userId);

  res.json({
    success: true,
    data: groups,
  });
}));

// Get group details
router.get('/:groupId', asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.userId!;

  const group = await groupService.getGroupDetail(groupId, userId);

  res.json({
    success: true,
    data: group,
  });
}));

// Check user's membership in group
router.get('/:groupId/membership', asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.userId!;

  const membership = await membershipService.getUserMembership(groupId, userId);

  res.json({
    success: true,
    data: {
      isMember: !!membership && membership.status === 'ACTIVE',
      role: membership?.role || null,
      status: membership?.status || null,
    },
  });
}));

// Update group
router.patch('/:groupId', asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { name } = req.body;
  const userId = req.userId!;

  const group = await groupService.updateGroup(groupId, userId, {
    name,
  });

  res.json({
    success: true,
    data: group,
  });
}));

// Delete group
router.delete('/:groupId', asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.userId!;

  await groupService.deleteGroup(groupId, userId);

  res.json({
    success: true,
    message: 'Group deleted successfully',
  });
}));

// Add member to group
router.post('/:groupId/members', asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { userId: targetUserId, role } = req.body;
  const adminId = req.userId!;

  // Check if requester is admin
  const isAdmin = await groupService.checkUserIsAdmin(groupId, adminId);
  if (!isAdmin) {
    throw new AppError('FORBIDDEN', 'Only group admins can add members', 403);
  }

  const membership = await membershipService.addMember(groupId, targetUserId, role);

  res.status(201).json({
    success: true,
    data: membership,
  });
}));

// Remove member from group
router.delete('/:groupId/members/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { groupId, userId: targetUserId } = req.params;
  const adminId = req.userId!;

  await membershipService.removeMember(groupId, targetUserId, adminId);

  res.json({
    success: true,
    message: 'Member removed successfully',
  });
}));

// Update member role
router.patch('/:groupId/members/:userId/role', asyncHandler(async (req: Request, res: Response) => {
  const { groupId, userId: targetUserId } = req.params;
  const { role } = req.body;
  const adminId = req.userId!;

  const membership = await membershipService.updateRole(groupId, targetUserId, adminId, role);

  res.json({
    success: true,
    data: membership,
  });
}));

// Leave group
router.post('/:groupId/leave', asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.userId!;

  await membershipService.leaveGroup(groupId, userId);

  res.json({
    success: true,
    message: 'Successfully left the group',
  });
}));

// Generate invite
router.post('/:groupId/invites', asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { expiresInDays } = req.body;
  const userId = req.userId!;

  const result = await inviteService.generateInvite({
    groupId,
    createdBy: userId,
    expiresInDays,
  });

  res.status(201).json({
    success: true,
    data: result,
  });
}));

// Get group invites
router.get('/:groupId/invites', asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { status } = req.query;
  const userId = req.userId!;

  const invites = await inviteService.getGroupInvites(groupId, userId, status as any);

  res.json({
    success: true,
    data: invites,
  });
}));

// Revoke invite
router.delete('/:groupId/invites/:inviteId', asyncHandler(async (req: Request, res: Response) => {
  const { inviteId } = req.params;
  const userId = req.userId!;

  await inviteService.revokeInvite(inviteId, userId);

  res.json({
    success: true,
    message: 'Invite revoked successfully',
  });
}));

// Get group recent activity
router.get('/:groupId/activity', asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { limit = '10' } = req.query;
  const userId = req.userId!;

  // Verify user is a member of the group
  const membership = await membershipService.getUserMembership(groupId, userId);
  if (!membership || membership.status !== 'ACTIVE') {
    throw new AppError('FORBIDDEN', 'You must be a member of this group to view activity', 403);
  }

  const limitNum = Math.min(parseInt(limit as string, 10), 50); // Max 50 items

  // Get recent leaderboard updates (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const leaderboardUpdates = await prisma.groupLeaderboardEntry.findMany({
    where: {
      groupId,
      lastUpdated: {
        gte: thirtyDaysAgo,
      },
    },
    include: {
      user: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      lastUpdated: 'desc',
    },
    take: limitNum,
  });

  // Get recent rooms created in this group (last 30 days)
  const recentRooms = await prisma.room.findMany({
    where: {
      groupId,
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    include: {
      creator: {
        select: {
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limitNum,
  });

  // Combine and sort activities
  const activities: Array<{
    id: string;
    type: 'leaderboard_update' | 'room_created';
    timestamp: Date;
    user: {
      displayName: string;
      avatarUrl?: string;
    };
    data: Record<string, any>;
  }> = [];

  // Add leaderboard updates
  leaderboardUpdates.forEach((update: any) => {
    activities.push({
      id: `leaderboard-${update.userId}-${update.lastUpdated.getTime()}`,
      type: 'leaderboard_update',
      timestamp: update.lastUpdated,
      user: {
        displayName: update.user.displayName,
        avatarUrl: update.user.avatarUrl || undefined,
      },
      data: {
        points: update.totalPoints,
      },
    });
  });

  // Add room creations
  recentRooms.forEach((room: any) => {
    activities.push({
      id: `room-${room.id}`,
      type: 'room_created',
      timestamp: room.createdAt,
      user: {
        displayName: room.creator?.displayName || 'Unknown',
        avatarUrl: room.creator?.avatarUrl || undefined,
      },
      data: {
        roomCode: room.code,
      },
    });
  });

  // Sort by timestamp descending and limit
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const limitedActivities = activities.slice(0, limitNum);

  res.json({
    success: true,
    data: {
      activities: limitedActivities,
    },
  });
}));

// Get active rooms for a group
router.get('/:groupId/rooms', asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.userId!;

  // Verify user is a member of the group
  const membership = await membershipService.getUserMembership(groupId, userId);
  if (!membership || membership.status !== 'ACTIVE') {
    throw new AppError('FORBIDDEN', 'You must be a member of this group to view active rooms', 403);
  }

  const rooms = roomService.getActiveRoomsForGroup(groupId);

  res.json({
    success: true,
    data: {
      rooms
    }
  });
}));

// List scheduled games for a group
router.get('/:groupId/scheduled-games', asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.userId!;

  // Verify membership
  const membership = await membershipService.getUserMembership(groupId, userId);
  if (!membership || membership.status !== 'ACTIVE') {
    throw new AppError('FORBIDDEN', 'You must be a member of this group to view scheduled games', 403);
  }

  const games = await scheduledGameService.listScheduledGamesForGroup(groupId);
  res.json({ success: true, data: { games } });
}));

// Create scheduled game (admin only)
router.post('/:groupId/scheduled-games', asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.userId!;
  const isAdmin = await groupService.checkUserIsAdmin(groupId, userId);
  if (!isAdmin) throw new AppError('FORBIDDEN', 'Only group admins can create scheduled games', 403);

  const { title, description, startAt, durationMinutes, recurrence } = req.body;
  const created = await scheduledGameService.createScheduledGame(groupId, userId, { title, description, startAt, durationMinutes, recurrence });
  res.status(201).json({ success: true, data: created });
}));

// Get scheduled game details
router.get('/:groupId/scheduled-games/:id', asyncHandler(async (req: Request, res: Response) => {
  const { groupId, id } = req.params;
  const userId = req.userId!;

  const membership = await membershipService.getUserMembership(groupId, userId);
  if (!membership || membership.status !== 'ACTIVE') throw new AppError('FORBIDDEN', 'You must be a member of this group to view this scheduled game', 403);

  const sg = await scheduledGameService.getScheduledGame(id);
  res.json({ success: true, data: sg });
}));

// Update scheduled game (admin only)
router.patch('/:groupId/scheduled-games/:id', asyncHandler(async (req: Request, res: Response) => {
  const { groupId, id } = req.params;
  const userId = req.userId!;
  const isAdmin = await groupService.checkUserIsAdmin(groupId, userId);
  if (!isAdmin) throw new AppError('FORBIDDEN', 'Only group admins can update scheduled games', 403);

  const updated = await scheduledGameService.updateScheduledGame(id, req.body);
  res.json({ success: true, data: updated });
}));

// Delete / cancel scheduled game (admin only)
router.delete('/:groupId/scheduled-games/:id', asyncHandler(async (req: Request, res: Response) => {
  const { groupId, id } = req.params;
  const userId = req.userId!;
  const isAdmin = await groupService.checkUserIsAdmin(groupId, userId);
  if (!isAdmin) throw new AppError('FORBIDDEN', 'Only group admins can delete scheduled games', 403);

  await scheduledGameService.deleteScheduledGame(id);
  res.json({ success: true, message: 'Scheduled game cancelled' });
}));

// Manual start scheduled game (admin only)
router.post('/:groupId/scheduled-games/:id/start', asyncHandler(async (req: Request, res: Response) => {
  const { groupId, id } = req.params;
  const userId = req.userId!;
  const isAdmin = await groupService.checkUserIsAdmin(groupId, userId);
  if (!isAdmin) throw new AppError('FORBIDDEN', 'Only group admins can start scheduled games', 403);

  const result = await scheduledGameService.startScheduledGame(id, userId);
  if (result.alreadyStarted) {
    return res.json({ success: true, data: result.scheduledGame });
  }

  res.json({ success: true, data: { scheduledGame: result.scheduledGame, roomCode: result.roomCode } });
}));

// Get ICS for scheduled game
router.get('/:groupId/scheduled-games/:id/ics', asyncHandler(async (req: Request, res: Response) => {
  const { groupId, id } = req.params;
  const userId = req.userId!;

  const membership = await membershipService.getUserMembership(groupId, userId);
  if (!membership || membership.status !== 'ACTIVE') throw new AppError('FORBIDDEN', 'You must be a member of this group to download calendar invite', 403);

  const sg = await scheduledGameService.getScheduledGame(id);
  const ics = generateIcsForScheduledGame(sg);
  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', `attachment; filename="scheduled-game-${sg.id}.ics"`);
  res.send(ics);
}));

export default router;