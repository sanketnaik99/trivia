import { Server } from 'socket.io';
import { logger } from '../utils/logger.util';
import { handleJoin, handleLeave, handleDisconnect, handleCreate } from './room.handler';
import { handleReady, handleAnswer, handleComplete } from './game.handler';
import prisma from '../config/prisma';

export function registerSocketHandlers(io: Server) {
  // Socket.IO middleware for authentication
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      try {
        const { clerkClient } = await import('@clerk/clerk-sdk-node');
        const sessionClaims = await clerkClient.verifyToken(token);
        (socket as any).userId = sessionClaims.sub;

        // Auto-join group rooms
        const memberships = await prisma.membership.findMany({
          where: {
            userId: (socket as any).userId,
            status: 'ACTIVE',
          },
          select: { groupId: true },
        });
        for (const membership of memberships) {
          socket.join(`group:${membership.groupId}`);
        }
      } catch (err) {
        logger.warn('Socket auth failed', { socketId: socket.id });
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    logger.info('Socket connected', { socketId: socket.id, userId: (socket as any).userId });

    socket.on('room:create', async (payload: { groupId?: string }) => {
      logger.info('room:create event', { socketId: socket.id, groupId: payload?.groupId });
      await handleCreate(io, socket, payload);
    });
    socket.on('JOIN', (payload: { playerId: string; playerName: string; roomCode: string }) => {
      logger.info('JOIN event', { socketId: socket.id, playerName: payload?.playerName, roomCode: payload?.roomCode });
      handleJoin(io, socket, payload);
    });
    socket.on('READY', (payload: { isReady: boolean }) => {
      logger.info('READY event', { socketId: socket.id, isReady: payload?.isReady });
      handleReady(io, socket, payload);
    });
    socket.on('ANSWER', (payload: { answerText: string; timestamp: number }) => {
      logger.info('ANSWER event', { socketId: socket.id, hasText: !!payload?.answerText, ts: payload?.timestamp });
      handleAnswer(io, socket, payload);
    });
    socket.on('game:complete', async (payload: { results: Array<{ userId: string; points: number }> }) => {
      logger.info('game:complete event', { socketId: socket.id });
      await handleComplete(io, socket, payload);
    });
    socket.on('LEAVE', () => {
      logger.info('LEAVE event', { socketId: socket.id });
      handleLeave(io, socket);
    });
    socket.on('disconnect', (reason: unknown) => {
      logger.info('Socket disconnected', { socketId: socket.id, reason });
      handleDisconnect(io, socket);
    });
  });
}
