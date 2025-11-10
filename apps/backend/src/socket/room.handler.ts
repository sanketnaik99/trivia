import { Server, Socket } from 'socket.io';
import { roomService } from '../services/room.service';
import { gameService } from '../services/game.service';
import { roomStore } from '../store/room.store';
import { normalizeRoomCode } from '../utils/room-code.util';
import { logger } from '../utils/logger.util';
import prisma from '../config/prisma';
import { config } from '../config/env';

type SocketData = { roomCode?: string; playerId?: string };

async function isGroupMember(userId: string | null, groupId: string | null): Promise<boolean> {
  if (!userId || !groupId) return false;
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      groupId,
      status: 'ACTIVE',
    },
  });
  return !!membership;
}

export async function handleCreate(io: Server, socket: Socket, payload: { userId?: string; groupId?: string; selectedCategory?: string | null; feedbackMode?: 'supportive' | 'neutral' | 'roast' }) {
  try {
    // Resolve user identity: prefer socket-authenticated id, fall back to payload.userId (migration)
    const socketUserId = (socket as any).userId as string | undefined;
    const payloadUserId = payload.userId as string | undefined;
    if (socketUserId && payloadUserId && socketUserId !== payloadUserId) {
      logger.warn('Mismatched userId between socket auth and payload; preferring socket auth', { socketUserId, payloadUserId });
    }
    const resolvedUserId = socketUserId ?? payloadUserId;
    if (!resolvedUserId) {
      socket.emit('ERROR', { code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }
    const userId = resolvedUserId;
    const { groupId, selectedCategory = null, feedbackMode = 'neutral' } = payload;
    let groupName: string | null = null;

    if (groupId) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { name: true },
      });
      if (!group) {
        socket.emit('ERROR', { code: 'GROUP_NOT_FOUND', message: 'Group not found' });
        return;
      }
      groupName = group.name;
    }

    // Validate category if provided: must have >= 10 questions
    if (selectedCategory) {
      try {
        const count = await (prisma as any).question.count({ where: { category: selectedCategory } });
        if (count < 10) {
          socket.emit('ERROR', { code: 'INVALID_CATEGORY', message: `Category \"${selectedCategory}\" not found or has fewer than 10 questions` });
          return;
        }
      } catch (err) {
        socket.emit('ERROR', { code: 'INVALID_CATEGORY', message: `Category \"${selectedCategory}\" not found or has fewer than 10 questions` });
        return;
      }
    }

    // Validate feedbackMode
    if (!['supportive', 'neutral', 'roast'].includes(feedbackMode)) {
      socket.emit('ERROR', { code: 'INVALID_FEEDBACK_MODE', message: 'Invalid feedback mode' });
      return;
    }

    const { code, room } = await roomService.createRoom(userId, groupId, false, selectedCategory, feedbackMode);

    socket.emit('ROOM_CREATED', {
      code,
      groupId,
      groupName,
      selectedCategory: room.selectedCategory,
      feedbackMode: room.feedbackMode,
    });

  logger.info('Room created via socket', { code, groupId, userId, selectedCategory, feedbackMode });
  } catch (err: unknown) {
    const e = err as Error;
    logger.error('Room creation failed', { error: e.message });
    socket.emit('ERROR', { code: 'ROOM_CREATION_FAILED', message: e.message });
  }
}

export async function handleJoin(io: Server, socket: Socket, payload: { userId?: string; playerId?: string; playerName: string; roomCode: string }) {
  const roomCode = normalizeRoomCode(payload.roomCode);
  const room = roomStore.getRoom(roomCode);
  if (!room) {
    socket.emit('ERROR', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    return;
  }
  try {
    // Resolve user identity: prefer socket-authenticated id, fall back to payload.userId (migration)
    const socketUserId = (socket as any).userId as string | undefined;
    const payloadUserId = payload.userId as string | undefined;
    if (socketUserId && payloadUserId && socketUserId !== payloadUserId) {
      logger.warn('Mismatched userId between socket auth and payload on JOIN; preferring socket auth', { socketUserId, payloadUserId });
    }
    const resolvedUserId = socketUserId ?? payloadUserId ?? null;
    
    // First, check if the client provided a participantId (from local/session storage)
    // and that participant exists in the room — treat this as a reconnection.
    if (payload.playerId) {
      const existingById = room.participants.get(payload.playerId);
      if (existingById) {
        logger.info('Participant reconnection via payload.playerId', {
          roomCode,
          participantId: existingById.id,
          name: existingById.name,
        });

        const s = socket as Socket & { data: SocketData };
        s.data.roomCode = roomCode;
        s.data.playerId = existingById.id;
        socket.join(roomCode);
        // Cancel any scheduled cleanup for this room since someone reconnected
        roomStore.cancelCleanup(roomCode);
        // Mark participant as connected
        existingById.connectionStatus = 'connected';
  // Update participant socket id
  roomService.updateParticipantSocket(roomCode, existingById.id, socket.id);

        // Broadcast a RECONNECTED event to other participants so UI can react
        io.to(roomCode).emit('RECONNECTED', { participantId: existingById.id });

        // Send ROOM_STATE to reconnected user
        const participants = Array.from(room.participants.values());
        const participantsWithMembership = await Promise.all(
          participants.map(async (p) => ({
            ...p,
            isGroupMember: await isGroupMember(p.userId, room.groupId),
          }))
        );

        let groupName: string | undefined;
        if (room.groupId) {
          const group = await prisma.group.findUnique({
            where: { id: room.groupId },
            select: { name: true },
          });
          groupName = group?.name;
        }

        socket.emit('ROOM_STATE', {
          roomCode,
          gameState: room.gameState,
          participants: participantsWithMembership,
          currentQuestion: room.currentQuestion ? { id: room.currentQuestion.id, text: room.currentQuestion.text } : null,
          currentRound: room.currentRound
            ? { startTime: room.currentRound.startTime, duration: room.currentRound.duration, answeredCount: room.currentRound.participantAnswers.filter(a => a.answerText !== null).length }
            : null,
          leaderboard: gameService.calculateLeaderboard(room),
          groupId: room.groupId,
          groupName,
          selectedCategory: room.selectedCategory,
          feedbackMode: room.feedbackMode,
          maxActivePlayers: room.maxActivePlayers,
        });
        return;
      }
    }

    // Check if authenticated user is already in the room
    if (resolvedUserId) {
      const existingByUserId = Array.from(room.participants.values()).find(p => p.userId === resolvedUserId);
      if (existingByUserId) {
        logger.info('Authenticated user already in room, updating connection', {
          roomCode,
          userId: resolvedUserId,
          existingParticipantId: existingByUserId.id,
          name: existingByUserId.name
        });
  // Update the socket data to point to existing participant
        const s = socket as Socket & { data: SocketData };
        s.data.roomCode = roomCode;
        s.data.playerId = existingByUserId.id;
        socket.join(roomCode);
  // Cancel any scheduled cleanup for this room since someone reconnected
  roomStore.cancelCleanup(roomCode);
  // Mark participant as connected
  existingByUserId.connectionStatus = 'connected';
  // Update participant socket id
  roomService.updateParticipantSocket(roomCode, existingByUserId.id, socket.id);
        
        // Send ROOM_STATE to reconnected user
        const participants = Array.from(room.participants.values());
        const participantsWithMembership = await Promise.all(
          participants.map(async (p) => ({
            ...p,
            isGroupMember: await isGroupMember(p.userId, room.groupId),
          }))
        );

        let groupName: string | undefined;
        if (room.groupId) {
          const group = await prisma.group.findUnique({
            where: { id: room.groupId },
            select: { name: true },
          });
          groupName = group?.name;
        }

        socket.emit('ROOM_STATE', {
          roomCode,
          gameState: room.gameState,
          participants: participantsWithMembership,
          currentQuestion: room.currentQuestion ? { id: room.currentQuestion.id, text: room.currentQuestion.text } : null,
          currentRound: room.currentRound
            ? { startTime: room.currentRound.startTime, duration: room.currentRound.duration, answeredCount: room.currentRound.participantAnswers.filter(a => a.answerText !== null).length }
            : null,
          leaderboard: gameService.calculateLeaderboard(room),
          groupId: room.groupId,
          groupName,
        });
        return;
      }
    } else {
      // For anonymous users, check if participant with same name already exists
      const existingByName = Array.from(room.participants.values()).find(
        p => p.name.toLowerCase() === payload.playerName.trim().toLowerCase()
      );
      if (existingByName) {
        logger.info('Removing stale anonymous participant before rejoin', { 
          roomCode, 
          participantId: existingByName.id,
          name: existingByName.name 
        });
        roomService.removeParticipant(roomCode, existingByName.id);
      }
    }
    
    const participant = roomService.addParticipant(roomCode, payload.playerName, resolvedUserId);
  socket.join(roomCode);
  // track on socket (narrow data type)
  const s = socket as Socket & { data: SocketData };
  s.data.roomCode = roomCode;
  s.data.playerId = participant.id;
    // persist socket id for this participant
    roomService.updateParticipantSocket(roomCode, participant.id, socket.id);

    // Check group membership
    const isGroupMemberFlag = await isGroupMember(participant.userId, room.groupId);

    // Broadcast to others with spectator count included
    const spectatorCount = Array.from(room.participants.values()).filter(p => p.role === 'spectator').length;
    socket.to(roomCode).emit('PLAYER_JOINED', {
      participant: {
        id: participant.id,
        name: participant.name,
        role: participant.role,
        isReady: participant.isReady,
        connectionStatus: participant.connectionStatus,
        score: participant.score,
        roundsWon: participant.roundsWon,
        lastWinTimestamp: participant.lastWinTimestamp,
        joinedAt: participant.joinedAt,
        isGroupMember: isGroupMemberFlag,
      },
      spectatorCount,
    });

    // Send ROOM_STATE to joiner (simple snapshot)
    const participants = Array.from(room.participants.values());
    const participantsWithMembership = await Promise.all(
      participants.map(async (p) => ({
        ...p,
        isGroupMember: await isGroupMember(p.userId, room.groupId),
      }))
    );

    let groupName: string | undefined;
    if (room.groupId) {
      const group = await prisma.group.findUnique({
        where: { id: room.groupId },
        select: { name: true },
      });
      groupName = group?.name;
    }

    socket.emit('ROOM_STATE', {
      roomCode,
      gameState: room.gameState,
      participants: participantsWithMembership,
      currentQuestion: room.currentQuestion ? { id: room.currentQuestion.id, text: room.currentQuestion.text } : null,
      currentRound: room.currentRound
        ? { startTime: room.currentRound.startTime, duration: room.currentRound.duration, answeredCount: room.currentRound.participantAnswers.filter(a => a.answerText !== null).length }
        : null,
      // T050: Include leaderboard using shared calculator with proper tie-breakers
      leaderboard: gameService.calculateLeaderboard(room),
      groupId: room.groupId,
      groupName,
      selectedCategory: room.selectedCategory,
      feedbackMode: room.feedbackMode,
      maxActivePlayers: room.maxActivePlayers,
    });
  } catch (err: unknown) {
    const code = (err as Error)?.message || 'INTERNAL_ERROR';
    logger.error('JOIN failed', { roomCode, error: code });
    socket.emit('ERROR', { code, message: code.replaceAll('_', ' ').toLowerCase() });
  }
}

export function handleLeave(io: Server, socket: Socket) {
  const s = socket as Socket & { data: SocketData };
  const roomCode = s.data.roomCode;
  const playerId = s.data.playerId;
  if (!roomCode || !playerId) return;
  const room = roomStore.getRoom(roomCode);
  if (!room) return;
  const participant = room.participants.get(playerId);
  // Explicit leave: permanently remove participant
  roomService.removeParticipant(roomCode, playerId);
  socket.leave(roomCode);
  if (participant) {
    io.to(roomCode).emit('PARTICIPANT_LEFT', {
      participantId: playerId,
      userId: participant.userId,
      connectionStatus: 'left',
      timestamp: Date.now(),
    });
    // After a participant leaves, check if remaining active+connected players are all ready and start countdown server-side
    try {
      gameService.tryStartCountdown(io, roomCode);
    } catch (err) {
      logger.error('Failed to evaluate countdown after leave', { roomCode, error: (err as Error).message });
    }
  }
}

export function handleDisconnect(io: Server, socket: Socket) {
  logger.info('Socket disconnect handler', { socketId: socket.id });
  // On disconnect, mark participant as disconnected instead of removing them
  const s = socket as Socket & { data: SocketData };
  const roomCode = s.data.roomCode;
  const playerId = s.data.playerId;
  if (!roomCode || !playerId) return;
  const room = roomStore.getRoom(roomCode);
  if (!room) return;
  const participant = room.participants.get(playerId);
  if (!participant) return;
  // Remove participant immediately on disconnect so remaining players can continue
  roomService.removeParticipant(roomCode, playerId);
  socket.leave(roomCode);
  io.to(roomCode).emit('PARTICIPANT_LEFT', {
    participantId: participant.id,
    userId: participant.userId,
    connectionStatus: 'left',
    timestamp: Date.now(),
  });
  // After disconnect removal, evaluate countdown trigger on server
  try {
    gameService.tryStartCountdown(io, roomCode);
  } catch (err) {
    logger.error('Failed to evaluate countdown after disconnect', { roomCode, error: (err as Error).message });
  }
}
