import { Server } from 'socket.io';
import { logger } from '../utils/logger.util';
import { handleJoin, handleLeave, handleDisconnect, handleCreate } from './room.handler';
import { handleReady, handleAnswer, handleComplete } from './game.handler';
import { handleGroupSubscribe, handleGroupUnsubscribe } from './group.handler';
import prisma from '../config/prisma';
import { config } from '../config/env';

export function registerSocketHandlers(io: Server) {
  // Socket.IO middleware for authentication
  io.use(async (socket, next) => {
    // Try to get token from multiple places
    const token = socket.handshake.auth?.token || 
                  socket.handshake.query?.token || 
                  socket.handshake.headers?.authorization?.replace('Bearer ', '');
    
    console.log('Socket auth middleware - token sources checked:');
    console.log('- auth.token:', !!socket.handshake.auth?.token);
    console.log('- query.token:', !!socket.handshake.query?.token);
    console.log('- headers.authorization:', !!socket.handshake.headers?.authorization);
    console.log('Final token present:', !!token);
    console.log('CLERK_SECRET_KEY present:', !!config.clerkSecretKey);
    console.log('CLERK_SECRET_KEY value:', config.clerkSecretKey ? 'set' : 'not set');
    
    if (token) {
      try {
        const { createClerkClient } = await import('@clerk/clerk-sdk-node');
        const clerkClient = createClerkClient({ secretKey: config.clerkSecretKey });
        console.log('Verifying token with Clerk...');
        const sessionClaims = await clerkClient.verifyToken(token);
        (socket as any).userId = sessionClaims.sub;
        console.log('Socket auth successful, userId:', (socket as any).userId);

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
        console.error('Socket auth failed:', (err as Error).message);
        logger.warn('Socket auth failed', { socketId: socket.id, error: (err as Error).message });
      }
    } else {
      console.log('No token provided in socket handshake');
    }
    next();
  });

  io.on('connection', (socket) => {
    logger.info('Socket connected', { socketId: socket.id, userId: (socket as any).userId });

    socket.on('room:create', async (payload: { groupId?: string; roastMode?: boolean }) => {
      logger.info('room:create event', { socketId: socket.id, groupId: payload?.groupId, roastMode: payload?.roastMode });
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
    socket.on('ANSWER', async (payload: { answerText: string; timestamp: number }) => {
      logger.info('ANSWER event', { socketId: socket.id, hasText: !!payload?.answerText, ts: payload?.timestamp });
      await handleAnswer(io, socket, payload);
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

  // Group namespace for leaderboard updates
  const groupsNamespace = io.of('/groups');

  groupsNamespace.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
      try {
        const { createClerkClient } = await import('@clerk/clerk-sdk-node');
        const clerkClient = createClerkClient({ secretKey: config.clerkSecretKey });
        const sessionClaims = await clerkClient.verifyToken(token);
        (socket as any).userId = sessionClaims.sub;
      } catch (err) {
        logger.warn('Group socket auth failed', { socketId: socket.id, error: (err as Error).message });
      }
    }
    next();
  });

  groupsNamespace.on('connection', (socket) => {
    logger.info('Group socket connected', { socketId: socket.id, userId: (socket as any).userId });

    socket.on('group:subscribe', async (payload: { groupId: string }) => {
      logger.info('group:subscribe event', { socketId: socket.id, groupId: payload?.groupId });
      await handleGroupSubscribe(socket, payload);
    });

    socket.on('group:unsubscribe', async (payload: { groupId: string }) => {
      logger.info('group:unsubscribe event', { socketId: socket.id, groupId: payload?.groupId });
      await handleGroupUnsubscribe(socket, payload);
    });

    socket.on('disconnect', (reason: unknown) => {
      logger.info('Group socket disconnected', { socketId: socket.id, reason });
    });
  });
}
