import { Server, Socket } from 'socket.io';

export function toRoom(io: Server, roomCode: string, event: string, payload: any) {
  io.to(roomCode).emit(event, payload);
}

export function toSocket(socket: Socket, event: string, payload: any) {
  socket.emit(event, payload);
}

export function toAllExcept(socket: Socket, roomCode: string, event: string, payload: any) {
  socket.to(roomCode).emit(event, payload);
}
