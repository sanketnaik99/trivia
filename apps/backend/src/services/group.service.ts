import prisma from '../config/prisma';
import type { Prisma } from '@prisma/client';
import { AppError } from '../utils/error-handler.util';

export interface CreateGroupData {
  name: string;
  createdBy: string;
}

export interface UpdateGroupData {
  name?: string;
}

export class GroupService {
  async createGroup(data: CreateGroupData) {
    const { name, createdBy } = data;

    // Validate group name
    if (!name || name.length < 3 || name.length > 50) {
      throw new AppError('VALIDATION_ERROR', 'Group name must be between 3 and 50 characters', 400);
    }

    // Create group and membership in a transaction
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const group = await tx.group.create({
        data: {
          name: name.trim(),
          createdBy,
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId: createdBy,
          groupId: group.id,
          role: 'ADMIN',
        },
      });

      return { group, membership };
    });

    return result;
  }

  async getUserGroups(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [memberships, total] = await Promise.all([
      prisma.membership.findMany({
        where: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          group: {
            include: {
              _count: {
                select: { memberships: { where: { status: 'ACTIVE' } } },
              },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.membership.count({
        where: {
          userId,
          status: 'ACTIVE',
        },
      }),
    ]);

    const groups = memberships.map((membership: any) => ({
      id: membership.group.id,
      name: membership.group.name,
      privacy: membership.group.privacy,
      role: membership.role,
      memberCount: membership.group._count.memberships,
      joinedAt: membership.joinedAt,
    }));

    return {
      groups,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getGroupDetail(groupId: string, userId: string) {
    // First check if user is a member
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new AppError('FORBIDDEN', 'You are not a member of this group', 403);
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: {
          select: { memberships: { where: { status: 'ACTIVE' } } },
        },
      },
    });

    if (!group) {
      throw new AppError('NOT_FOUND', 'Group not found', 404);
    }

    return {
      group: {
        id: group.id,
        name: group.name,
        privacy: group.privacy,
        createdBy: group.createdBy,
        createdAt: group.createdAt,
        memberCount: group._count.memberships,
      },
      membership: {
        userId: membership.userId,
        groupId: membership.groupId,
        role: membership.role,
        joinedAt: membership.joinedAt,
        status: membership.status,
      },
      members: group.memberships.map((m: any) => ({
        id: m.id,
        userId: m.userId,
        groupId: m.groupId,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
        updatedAt: m.updatedAt,
        user: {
          id: m.user.id,
          displayName: m.user.displayName,
          avatarUrl: m.user.avatarUrl,
        },
      })),
    };
  }

  async updateGroup(groupId: string, userId: string, data: UpdateGroupData) {
    // Check if user is admin
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
    });

    if (!membership || membership.role !== 'ADMIN' || membership.status !== 'ACTIVE') {
      throw new AppError('FORBIDDEN', 'Only group admins can update the group', 403);
    }

    const { name } = data;

    if (name !== undefined) {
      if (!name || name.length < 3 || name.length > 50) {
        throw new AppError('VALIDATION_ERROR', 'Group name must be between 3 and 50 characters', 400);
      }
    }

    const group = await prisma.group.update({
      where: { id: groupId },
      data: {
        ...(name && { name: name.trim() }),
      },
    });

    return group;
  }

  async checkUserIsMember(groupId: string, userId: string): Promise<boolean> {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
    });

    return membership?.status === 'ACTIVE' || false;
  }

  async checkUserIsAdmin(groupId: string, userId: string): Promise<boolean> {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
    });

    return membership?.role === 'ADMIN' && membership?.status === 'ACTIVE' || false;
  }

  async deleteGroup(groupId: string, userId: string) {
    // Check if user is admin
    const isAdmin = await this.checkUserIsAdmin(groupId, userId);
    if (!isAdmin) {
      throw new AppError('FORBIDDEN', 'Only group admins can delete groups', 403);
    }

    // Delete group and all related data in transaction
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete all memberships
      await tx.membership.deleteMany({
        where: { groupId },
      });

      // Delete all invites
      await tx.groupInvite.deleteMany({
        where: { groupId },
      });

      // Delete all leaderboard entries
      await tx.groupLeaderboardEntry.deleteMany({
        where: { groupId },
      });

      // Delete the group
      await tx.group.delete({
        where: { id: groupId },
      });
    });
  }
}

export const groupService = new GroupService();