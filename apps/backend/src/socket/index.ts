import { Server } from 'socket.io';
import { logger } from '../utils/logger.util';
import { handleJoin, handleLeave, handleDisconnect } from './room.handler';
import { handleReady, handleAnswer } from './game.handler';

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: any) => {
    logger.info('Socket connected', { socketId: socket.id });

    socket.on('JOIN', (payload: any) => handleJoin(io, socket, payload));
    socket.on('READY', (payload: any) => handleReady(io, socket, payload));
    socket.on('ANSWER', (payload: any) => handleAnswer(io, socket, payload));
    socket.on('LEAVE', () => handleLeave(io, socket));
    socket.on('disconnect', (reason: any) => {
      logger.info('Socket disconnected', { socketId: socket.id, reason });
      handleDisconnect(io, socket);
    });
  });
}
