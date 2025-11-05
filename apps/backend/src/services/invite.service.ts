import { randomBytes } from 'crypto';
import prisma from '../config/prisma';
import { AppError } from '../utils/error-handler.util';
import { generateInviteCode, isValidInviteCode } from '../utils/invite-code.util';


export interface GenerateInviteData {
  groupId: string;
  createdBy: string;
  expiresInDays?: number;
}

export class InviteService {
  async generateInvite(data: GenerateInviteData) {
    const { groupId, createdBy, expiresInDays = 7 } = data;

    // Check if creator is admin
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId: createdBy, groupId },
      },
    });

    if (!membership || membership.role !== 'ADMIN' || membership.status !== 'ACTIVE') {
      throw new AppError('FORBIDDEN', 'Only group admins can generate invites', 403);
    }

    // Validate expiresInDays
    if (expiresInDays < 1 || expiresInDays > 30) {
      throw new AppError('VALIDATION_ERROR', 'Expiration must be between 1 and 30 days', 400);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const code = generateInviteCode();

    const invite = await prisma.groupInvite.create({
      data: {
        groupId,
        token: code, // Use the code as the token for simplicity
        createdBy,
        expiresAt,
      },
    });

    return {
      invite,
      inviteLink: `${process.env.FRONTEND_BASE_URL || 'http://localhost:3000'}/groups/invite/${code}`,
      inviteCode: code,
    };
  }

  async validateInvite(token: string) {
    const invite = await prisma.groupInvite.findUnique({
      where: { token },
      include: {
        group: true,
        creator: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    if (!invite) {
      throw new AppError('NOT_FOUND', 'Invite not found', 404);
    }

    // Only check if the invite is revoked since we want to allow reuse
    if (invite.status === 'REVOKED') {
      throw new AppError('CONFLICT', 'This invite has been revoked', 409);
    }

    if (invite.expiresAt < new Date()) {
      // Mark as expired
      await prisma.groupInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      throw new AppError('CONFLICT', 'Invite has expired', 409);
    }

    return invite;
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.validateInvite(token);

    // Check if user is already a member
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId, groupId: invite.groupId },
      },
    });

    if (existingMembership?.status === 'ACTIVE') {
      throw new AppError('CONFLICT', 'You are already a member of this group', 409);
    }

    // Accept invite and create membership in transaction
  const result = await prisma.$transaction(async (tx: import('@prisma/client').Prisma.TransactionClient) => {
      // Keep the invite active for reuse - don't mark as used
      const updatedInvite = await tx.groupInvite.findUnique({
        where: { id: invite.id },
      });

      // Create or reactivate membership
      const membership = await tx.membership.upsert({
        where: {
          userId_groupId: { userId, groupId: invite.groupId },
        },
        update: {
          status: 'ACTIVE',
          role: 'MEMBER',
          joinedAt: new Date(),
        },
        create: {
          userId,
          groupId: invite.groupId,
          role: 'MEMBER',
        },
      });

      return { invite: updatedInvite, membership };
    });

    return {
      membership: result.membership,
      group: invite.group,
    };
  }

  async acceptInviteByCode(code: string, userId: string) {
    // Validate code format first
    if (!isValidInviteCode(code)) {
      throw new AppError('VALIDATION_ERROR', 'Invalid invite code format', 400);
    }

    // Since we use the code as the token, we can directly call acceptInvite
    return this.acceptInvite(code, userId);
  }

  async revokeInvite(inviteId: string, userId: string) {
    const invite = await prisma.groupInvite.findUnique({
      where: { id: inviteId },
      include: { group: true },
    });

    if (!invite) {
      throw new AppError('NOT_FOUND', 'Invite not found', 404);
    }

    // Check if user is admin of the group
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId, groupId: invite.groupId },
      },
    });

    if (!membership || membership.role !== 'ADMIN' || membership.status !== 'ACTIVE') {
      throw new AppError('FORBIDDEN', 'Only group admins can revoke invites', 403);
    }

    if (invite.status !== 'ACTIVE') {
      throw new AppError('CONFLICT', `Cannot revoke an invite that is ${invite.status.toLowerCase()}`, 409);
    }

    return await prisma.groupInvite.update({
      where: { id: inviteId },
      data: { status: 'REVOKED' },
    });
  }

  async getGroupInvites(groupId: string, userId: string, status?: 'ACTIVE' | 'USED' | 'REVOKED' | 'EXPIRED') {
    // Check if user is admin
    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: { userId, groupId },
      },
    });

    if (!membership || membership.role !== 'ADMIN' || membership.status !== 'ACTIVE') {
      throw new AppError('FORBIDDEN', 'Only group admins can view invites', 403);
    }

    const where: any = { groupId };
    if (status) {
      where.status = status;
    }

    return await prisma.groupInvite.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const inviteService = new InviteService();