import { Server, Socket } from 'socket.io';

export function toRoom(io: Server, roomCode: string, event: string, payload: unknown) {
  io.to(roomCode).emit(event, payload);
}

export function toSocket(socket: Socket, event: string, payload: unknown) {
  socket.emit(event, payload);
}

export function toAllExcept(socket: Socket, roomCode: string, event: string, payload: unknown) {
  socket.to(roomCode).emit(event, payload);
}
