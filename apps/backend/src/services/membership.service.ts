import prisma from '../config/prisma';
import { AppError } from '../utils/error-handler.util';

export class MembershipService {
  async addMember(groupId: string, userId: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER') {
    // Check if user is already a member
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
    });

    if (existingMembership) {
      if (existingMembership.status === 'ACTIVE') {
        throw new AppError('CONFLICT', 'User is already a member of this group', 409);
      }
      // Reactivate membership
      return await prisma.membership.update({
        where: {
          userId_groupId: { userId, groupId },
        },
        data: {
          status: 'ACTIVE',
          role,
          joinedAt: new Date(),
        },
      });
    }

    // Check if group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new AppError('NOT_FOUND', 'Group not found', 404);
    }

    return await prisma.membership.create({
      data: {
        userId,
        groupId,
        role,
      },
    });
  }

  async removeMember(groupId: string, removerUserId: string, targetUserId: string) {
    // Check if remover is admin
    const removerMembership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId: removerUserId, groupId },
      },
    });

    if (!removerMembership || removerMembership.role !== 'ADMIN' || removerMembership.status !== 'ACTIVE') {
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

    return await prisma.membership.update({
      where: {
        userId_groupId: { userId: targetUserId, groupId },
      },
      data: {
        status: 'REMOVED',
      },
    });
  }

  async updateRole(groupId: string, updaterUserId: string, targetUserId: string, newRole: 'ADMIN' | 'MEMBER') {
    // Check if updater is admin
    const updaterMembership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId: updaterUserId, groupId },
      },
    });

    if (!updaterMembership || updaterMembership.role !== 'ADMIN' || updaterMembership.status !== 'ACTIVE') {
      throw new AppError('FORBIDDEN', 'Only group admins can update member roles', 403);
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

    return await prisma.membership.update({
      where: {
        userId_groupId: { userId: targetUserId, groupId },
      },
      data: {
        role: newRole,
      },
    });
  }

  async leaveGroup(groupId: string, userId: string) {
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
        throw new AppError('FORBIDDEN', 'Cannot leave group as the last admin. Promote another member first or delete the group.', 409);
      }
    }

    return await prisma.membership.update({
      where: {
        userId_groupId: { userId, groupId },
      },
      data: {
        status: 'LEFT',
      },
    });
  }

  async checkAdminPermission(groupId: string, userId: string): Promise<boolean> {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
    });

    return membership?.role === 'ADMIN' && membership?.status === 'ACTIVE' || false;
  }

  async getActiveMemberCount(groupId: string): Promise<number> {
    return await prisma.membership.count({
      where: {
        groupId,
        status: 'ACTIVE',
      },
    });
  }
}

export const membershipService = new MembershipService();