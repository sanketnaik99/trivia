import { Server, Socket } from 'socket.io';
import { gameService } from '../services/game.service';

export function handleReady(io: Server, socket: Socket, payload: { isReady: boolean }) {
  gameService.handleReady(io, socket, payload);
}

export function handleAnswer(io: Server, socket: Socket, payload: { answerText: string; timestamp: number }) {
  gameService.handleAnswer(io, socket, payload);
}
