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

  async createRoom(userId: string, groupId?: string | null, roastMode: boolean = false, selectedCategory: string | null = null, feedbackMode: 'supportive' | 'neutral' | 'roast' = 'neutral'): Promise<{ code: string; room: Room }> {
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
      roastMode,
      // new defaults
      selectedCategory: selectedCategory,
      feedbackMode: feedbackMode,
      voteState: null,
      cleanupTimer: null,
      maxActivePlayers: 16,
    };

    roomStore.createRoom(code, room);
    logger.info('Room created', { code, groupId, userId, roastMode });
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
    // allow joining as spectator if game active
    // if joining during active game, participant becomes spectator

    // name uniqueness in room
    for (const p of room.participants.values()) {
      if (p.name.toLowerCase() === name.trim().toLowerCase()) {
        throw new Error('NAME_TAKEN');
      }
    }

    // Determine role: active if in lobby and active count < maxActivePlayers
    const activeCount = Array.from(room.participants.values()).filter(p => p.role === 'active').length;
    const role: 'active' | 'spectator' = (room.gameState === 'lobby' && activeCount < (room.maxActivePlayers || 16)) ? 'active' : 'spectator';

    const participant: Participant = {
      id: uuidv4(),
      name: name.trim(),
      role,
      isReady: false,
      connectionStatus: 'connected',
      socketId: null,
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

  updateParticipantSocket(code: string, participantId: string, socketId: string | null) {
    const room = roomStore.getRoom(code);
    if (!room) return;
    const participant = room.participants.get(participantId);
    if (!participant) return;
    participant.socketId = socketId;
    roomStore.updateLastActivity(code);
  }

  removeParticipant(code: string, participantId: string) {
    const room = roomStore.getRoom(code);
    if (!room) return;
    // If participant was part of an active vote, remove their vote
    if (room.voteState && room.voteState.votedParticipantIds.has(participantId)) {
      room.voteState.votedParticipantIds.delete(participantId);
      // If no votes remain, clear voteState
      if (room.voteState.votedParticipantIds.size === 0) {
        room.voteState = null;
      }
    }
    room.participants.delete(participantId);
    roomStore.updateLastActivity(code);
    // If we're in the lobby, try to promote spectators into active slots
    if (room.gameState === 'lobby') {
      this.promoteSpectatorsIfNeeded(code);
    }
    if (room.participants.size === 0) {
      roomStore.scheduleCleanup(code, config.roomCleanupTimeout);
    }
  }

  /**
   * Promote waiting spectators into active slots when space is available.
   * Promotion order is by joinedAt (earliest first).
   */
  promoteSpectatorsIfNeeded(code: string) {
    const room = roomStore.getRoom(code);
    if (!room) return;
    const maxActive = room.maxActivePlayers || 16;
    const participants = Array.from(room.participants.values());
    const activeCount = participants.filter(p => p.role === 'active').length;
    if (activeCount >= maxActive) return;

    // Find spectators ordered by joinedAt
    const spectators = participants
      .filter(p => p.role === 'spectator')
      .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));

    let slots = maxActive - activeCount;
    for (const s of spectators) {
      if (slots <= 0) break;
      s.role = 'active';
      slots -= 1;
    }
    roomStore.updateLastActivity(code);
  }

  updateLastActivity(code: string) {
    roomStore.updateLastActivity(code);
  }
}

export const roomService = new RoomService();
