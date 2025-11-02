import { v4 as uuidv4 } from 'uuid';
import { roomStore } from '../store/room.store';
import { generateRoomCode } from '../utils/room-code.util';
import { config } from '../config/env';
import { Participant, Room } from '../types/room.types';
import { logger } from '../utils/logger.util';

class RoomService {
  createRoom(): { code: string; room: Room } {
    if (roomStore.getRoomCount() >= config.maxRooms) {
      throw new Error('ROOM_LIMIT_REACHED');
    }

    // Ensure uniqueness (low collision probability; loop safeguard)
    let code = generateRoomCode();
    let attempts = 0;
    while (roomStore.getRoom(code) && attempts < 5) {
      code = generateRoomCode();
      attempts++;
    }

    const now = Date.now();
    const room: Room = {
      code,
      participants: new Map(),
      gameState: 'lobby',
      currentQuestion: null,
      currentRound: null,
      usedQuestionIds: [],
      createdAt: now,
      lastActivityAt: now,
    };

    roomStore.createRoom(code, room);
    logger.info('Room created', { code });
    return { code, room };
  }

  validateRoomCode(code: string) {
    const room = roomStore.getRoom(code);
    if (!room) return { exists: false, canJoin: false, participantCount: 0, gameState: 'lobby' as const };
    const canJoin = room.gameState !== 'active';
    return { exists: true, canJoin, participantCount: room.participants.size, gameState: room.gameState };
  }

  addParticipant(code: string, name: string): Participant {
    const room = roomStore.getRoom(code);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    if (room.gameState === 'active') throw new Error('GAME_IN_PROGRESS');

    // name uniqueness in room
    for (const p of room.participants.values()) {
      if (p.name.toLowerCase() === name.trim().toLowerCase()) {
        throw new Error('NAME_TAKEN');
      }
    }

    const participant: Participant = {
      id: uuidv4(),
      name: name.trim(),
      isReady: false,
      connectionStatus: 'connected',
      score: 0,
      roundsWon: 0,
      lastWinTimestamp: null,
      joinedAt: Date.now(),
    };

    room.participants.set(participant.id, participant);
    roomStore.updateLastActivity(code);
    return participant;
  }

  removeParticipant(code: string, participantId: string) {
    const room = roomStore.getRoom(code);
    if (!room) return;
    room.participants.delete(participantId);
    roomStore.updateLastActivity(code);
    if (room.participants.size === 0) {
      roomStore.scheduleCleanup(code, config.roomCleanupTimeout);
    }
  }

  updateLastActivity(code: string) {
    roomStore.updateLastActivity(code);
  }
}

export const roomService = new RoomService();
