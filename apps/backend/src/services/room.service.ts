import { v4 as uuidv4 } from 'uuid';
import { roomStore } from '../store/room.store';
import { generateRoomCode } from '../utils/room-code.util';
import { config } from '../config/env';
import { Participant, Room } from '../types/room.types';
import { logger } from '../utils/logger.util';
import prisma from '../config/prisma';

class RoomService {
  getActiveRoomsForGroup(groupId: string): { code: string; participantCount: number; gameState: string }[] {
    return roomStore.getRoomsForGroup(groupId).map(room => ({
      code: room.code,
      participantCount: room.participants.size,
      gameState: room.gameState
    }));
  }

  async createRoom(userId: string, groupId?: string | null): Promise<{ code: string; room: Room }> {
    if (roomStore.getRoomCount() >= config.maxRooms) {
      throw new Error('ROOM_LIMIT_REACHED');
    }

    // Validate group membership if groupId provided
    if (groupId) {
      const membership = await prisma.membership.findFirst({
        where: {
          userId,
          groupId,
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new Error('USER_NOT_GROUP_MEMBER');
      }
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
      groupId: groupId || null,
      createdBy: userId,
    };

    roomStore.createRoom(code, room);
    logger.info('Room created', { code, groupId, userId });
    return { code, room };
  }

  validateRoomCode(code: string) {
    const room = roomStore.getRoom(code);
    if (!room) return { exists: false, canJoin: false, participantCount: 0, gameState: 'lobby' as const };
    const canJoin = room.gameState !== 'active';
    return { 
      exists: true, 
      canJoin, 
      participantCount: room.participants.size, 
      gameState: room.gameState,
      groupId: room.groupId 
    };
  }

  addParticipant(code: string, name: string, userId?: string | null): Participant {
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
      userId: userId || null,
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
