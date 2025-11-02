import { Server } from 'socket.io';
import { logger } from '../utils/logger.util';
import { handleJoin, handleLeave, handleDisconnect } from './room.handler';
import { handleReady, handleAnswer } from './game.handler';

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket) => {
    logger.info('Socket connected', { socketId: socket.id });

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
