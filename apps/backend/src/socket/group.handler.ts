import { Socket } from 'socket.io';
import { logger } from '../utils/logger.util';
import prisma from '../config/prisma';

export async function handleGroupSubscribe(socket: Socket, payload: { groupId: string }) {
  try {
    const userId = (socket as any).userId;
    if (!userId) {
      socket.emit('group:error', { code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const { groupId } = payload;

    // Verify user is an active member of the group
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        groupId,
        status: 'ACTIVE',
      },
    });

    if (!membership) {
      socket.emit('group:error', { code: 'FORBIDDEN', message: 'User is not a member of this group' });
      return;
    }

    // Join the group room
    socket.join(`group:${groupId}`);

    // Get group info
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });

    socket.emit('group:subscribed', {
      groupId,
      groupName: group?.name || 'Unknown Group',
    });

    logger.info('User subscribed to group', { userId, groupId, socketId: socket.id });
  } catch (error) {
    logger.error('Error in handleGroupSubscribe', { error, socketId: socket.id });
    socket.emit('group:error', { code: 'INTERNAL_ERROR', message: 'Failed to subscribe to group' });
  }
}

export async function handleGroupUnsubscribe(socket: Socket, payload: { groupId: string }) {
  try {
    const { groupId } = payload;

    // Leave the group room
    socket.leave(`group:${groupId}`);

    socket.emit('group:unsubscribed', { groupId });

    logger.info('User unsubscribed from group', { groupId, socketId: socket.id });
  } catch (error) {
    logger.error('Error in handleGroupUnsubscribe', { error, socketId: socket.id });
    socket.emit('group:error', { code: 'INTERNAL_ERROR', message: 'Failed to unsubscribe from group' });
  }
}