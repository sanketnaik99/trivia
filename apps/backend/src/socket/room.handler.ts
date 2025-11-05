import { Server, Socket } from 'socket.io';
import { roomService } from '../services/room.service';
import { gameService } from '../services/game.service';
import { roomStore } from '../store/room.store';
import { normalizeRoomCode } from '../utils/room-code.util';
import { logger } from '../utils/logger.util';
import prisma from '../config/prisma';

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

export async function handleCreate(io: Server, socket: Socket, payload: { groupId?: string }) {
  try {
    // Get userId from socket auth
    const userId = (socket as any).userId; // Assume set by auth middleware
    if (!userId) {
      socket.emit('ERROR', { code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    const { groupId } = payload;
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

    const { code, room } = await roomService.createRoom(userId, groupId);

    socket.emit('ROOM_CREATED', {
      code,
      groupId,
      groupName,
    });

    logger.info('Room created via socket', { code, groupId, userId });
  } catch (err: unknown) {
    const e = err as Error;
    logger.error('Room creation failed', { error: e.message });
    socket.emit('ERROR', { code: 'ROOM_CREATION_FAILED', message: e.message });
  }
}

export async function handleJoin(io: Server, socket: Socket, payload: { playerId: string; playerName: string; roomCode: string }) {
  const roomCode = normalizeRoomCode(payload.roomCode);
  const room = roomStore.getRoom(roomCode);
  if (!room) {
    socket.emit('ERROR', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    return;
  }
  try {
    const userId = (socket as any).userId;
    
    // Check if authenticated user is already in the room
    if (userId) {
      const existingByUserId = Array.from(room.participants.values()).find(p => p.userId === userId);
      if (existingByUserId) {
        logger.info('Authenticated user already in room, updating connection', { 
          roomCode, 
          userId,
          existingParticipantId: existingByUserId.id,
          name: existingByUserId.name 
        });
        // Update the socket data to point to existing participant
        const s = socket as Socket & { data: SocketData };
        s.data.roomCode = roomCode;
        s.data.playerId = existingByUserId.id;
        socket.join(roomCode);
        
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
    
    const participant = roomService.addParticipant(roomCode, payload.playerName, userId);
  socket.join(roomCode);
  // track on socket (narrow data type)
  const s = socket as Socket & { data: SocketData };
  s.data.roomCode = roomCode;
  s.data.playerId = participant.id;

    // Check group membership
    const isGroupMemberFlag = await isGroupMember(participant.userId, room.groupId);

    // Broadcast to others
    socket.to(roomCode).emit('PLAYER_JOINED', { participant: {
      id: participant.id,
      name: participant.name,
      isReady: participant.isReady,
      connectionStatus: participant.connectionStatus,
      score: participant.score,
      roundsWon: participant.roundsWon,
      lastWinTimestamp: participant.lastWinTimestamp,
      joinedAt: participant.joinedAt,
      isGroupMember: isGroupMemberFlag,
    }});

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
  roomService.removeParticipant(roomCode, playerId);
  socket.leave(roomCode);
  if (participant) {
    io.to(roomCode).emit('PLAYER_LEFT', { playerId, playerName: participant.name });
  }
}

export function handleDisconnect(io: Server, socket: Socket) {
  logger.info('Socket disconnect handler', { socketId: socket.id });
  handleLeave(io, socket);
}
