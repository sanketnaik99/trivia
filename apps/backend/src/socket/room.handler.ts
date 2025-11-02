import { Server, Socket } from 'socket.io';
import { roomService } from '../services/room.service';
import { gameService } from '../services/game.service';
import { roomStore } from '../store/room.store';
import { normalizeRoomCode } from '../utils/room-code.util';
import { logger } from '../utils/logger.util';

export function handleJoin(io: Server, socket: Socket, payload: { playerId: string; playerName: string; roomCode: string }) {
  const roomCode = normalizeRoomCode(payload.roomCode);
  const room = roomStore.getRoom(roomCode);
  if (!room) {
    socket.emit('ERROR', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    return;
  }
  try {
    // Check if participant with same name already exists and remove stale connection
    // This handles rapid reconnections or browser refreshes
    const existingByName = Array.from(room.participants.values()).find(
      p => p.name.toLowerCase() === payload.playerName.trim().toLowerCase()
    );
    if (existingByName) {
      logger.info('Removing stale participant before rejoin', { 
        roomCode, 
        participantId: existingByName.id,
        name: existingByName.name 
      });
      roomService.removeParticipant(roomCode, existingByName.id);
    }
    
    const participant = roomService.addParticipant(roomCode, payload.playerName);
    socket.join(roomCode);
    // track on socket
    (socket.data as any).roomCode = roomCode;
    (socket.data as any).playerId = participant.id;

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
    }});

    // Send ROOM_STATE to joiner (simple snapshot)
    const participants = Array.from(room.participants.values());
    socket.emit('ROOM_STATE', {
      roomCode,
      gameState: room.gameState,
      participants,
      currentQuestion: room.currentQuestion ? { id: room.currentQuestion.id, text: room.currentQuestion.text } : null,
      currentRound: room.currentRound
        ? { startTime: room.currentRound.startTime, duration: room.currentRound.duration, answeredCount: room.currentRound.participantAnswers.filter(a => a.answerText !== null).length }
        : null,
      // T050: Include leaderboard using shared calculator with proper tie-breakers
      leaderboard: gameService.calculateLeaderboard(room),
    });
  } catch (err: any) {
    const code = err?.message || 'INTERNAL_ERROR';
    logger.error('JOIN failed', { roomCode, error: code });
    socket.emit('ERROR', { code, message: code.replaceAll('_', ' ').toLowerCase() });
  }
}

export function handleLeave(io: Server, socket: Socket) {
  const roomCode = (socket.data as any)?.roomCode as string | undefined;
  const playerId = (socket.data as any)?.playerId as string | undefined;
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
