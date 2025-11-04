import { Server, Socket } from 'socket.io';
import { gameService } from '../services/game.service';
import { leaderboardService } from '../services/leaderboard.service';
import { roomStore } from '../store/room.store';
import { logger } from '../utils/logger.util';

export function handleReady(io: Server, socket: Socket, payload: { isReady: boolean }) {
  gameService.handleReady(io, socket, payload);
}

export function handleAnswer(io: Server, socket: Socket, payload: { answerText: string; timestamp: number }) {
  gameService.handleAnswer(io, socket, payload);
}

export async function handleComplete(io: Server, socket: Socket, payload: { results: Array<{ userId: string; points: number }> }) {
  const s = socket as Socket & { data: { roomCode?: string; playerId?: string } };
  const roomCode = s.data.roomCode;
  if (!roomCode) return socket.emit('ERROR', { code: 'NOT_JOINED', message: 'Not joined' });

  const room = roomStore.getRoom(roomCode);
  if (!room) return socket.emit('ERROR', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });

  if (!room.groupId) return; // Only for group rooms

  try {
    await leaderboardService.updateGroupLeaderboard(room.groupId, roomCode, payload.results);

    // Broadcast leaderboard updated to group members
    io.to(`group:${room.groupId}`).emit('leaderboard:updated', {
      groupId: room.groupId,
      roomCode,
      timestamp: Date.now(),
      // TODO: Add updates array with userId, newTotal, pointsAdded, rank changes
    });

    logger.info('Leaderboard updated for completed game', { roomCode, groupId: room.groupId });
  } catch (err: unknown) {
    logger.error('Leaderboard update failed', { roomCode, error: (err as Error).message });
  }
}
