import { Router, Request, Response } from 'express';
import { groupService } from '../services/group.service';
import { membershipService } from '../services/membership.service';
import { inviteService } from '../services/invite.service';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../utils/error-handler.util';

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

// Accept invite by token
router.post('/invites/:token/accept', asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;
  const userId = req.userId!;

  const result = await inviteService.acceptInvite(token, userId);

  res.json({
    success: true,
    data: result,
  });
}));

// Accept invite by code
router.post('/invites/code/:code/accept', asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const userId = req.userId!;

  const result = await inviteService.acceptInviteByCode(code, userId);

  res.json({
    success: true,
    data: result,
  });
}));

export default router;