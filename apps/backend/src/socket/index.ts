import { Server } from 'socket.io';
import { logger } from '../utils/logger.util';

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: any) => {
    logger.info('Socket connected', { socketId: socket.id });

    // Register basic events - detailed handlers implemented in room.handler/game.handler later
    socket.on('JOIN', (payload: any) => {
      logger.info('JOIN received', { socketId: socket.id, payload });
      // TODO: implement join handling
      socket.emit('ERROR', { code: 'NOT_IMPLEMENTED', message: 'JOIN handler not implemented yet' });
    });

    socket.on('READY', (payload: any) => {
      logger.info('READY received', { socketId: socket.id, payload });
      socket.emit('ERROR', { code: 'NOT_IMPLEMENTED', message: 'READY handler not implemented yet' });
    });

    socket.on('ANSWER', (payload: any) => {
      logger.info('ANSWER received', { socketId: socket.id });
      socket.emit('ERROR', { code: 'NOT_IMPLEMENTED', message: 'ANSWER handler not implemented yet' });
    });

    socket.on('LEAVE', () => {
      logger.info('LEAVE received', { socketId: socket.id });
      socket.disconnect(true);
    });

    socket.on('disconnect', (reason: any) => {
      logger.info('Socket disconnected', { socketId: socket.id, reason });
    });
  });
}
