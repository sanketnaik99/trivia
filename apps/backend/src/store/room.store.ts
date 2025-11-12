import { Room } from '../types/room.types';
import { logger } from '../utils/logger.util';
import prisma from '../config/prisma';
import { ScheduledGameStatus } from '@prisma/client';

export class RoomStore {
  private rooms: Map<string, Room> = new Map();
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();

  createRoom(code: string, room: Room): Room {
    // T065: Normalize to uppercase for case-insensitive storage
    const normalizedCode = code.toUpperCase();
    this.rooms.set(normalizedCode, room);
    logger.info('RoomStore: created room', { code: normalizedCode });
    return room;
  }

  getRoom(code: string): Room | undefined {
    // T065: Normalize to uppercase for case-insensitive lookup
    return this.rooms.get(code.toUpperCase());
  }

  deleteRoom(code: string): void {
    const normalizedCode = code.toUpperCase();
    this.cancelCleanup(normalizedCode);
    this.rooms.delete(normalizedCode);
    logger.info('RoomStore: deleted room', { code: normalizedCode });

    // If this room was created from a scheduled game, mark that scheduled game as COMPLETED.
    // Fire-and-forget to avoid changing the sync signature of deleteRoom.
    prisma.scheduledGame.updateMany({
      where: {
        roomId: normalizedCode,
        status: ScheduledGameStatus.STARTED,
      },
      data: { status: ScheduledGameStatus.COMPLETED },
    })
      .then((result) => {
        if (result.count > 0) {
          logger.info('RoomStore: marked scheduled game(s) COMPLETED after room deletion', {
            code: normalizedCode,
            updatedCount: result.count,
          });
        }
      })
      .catch((err: unknown) => {
        logger.error('RoomStore: failed to mark scheduled game COMPLETED after room deletion', {
          code: normalizedCode,
          error: (err as Error).message,
        });
      });
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  scheduleCleanup(code: string, delayMs: number): void {
    const normalizedCode = code.toUpperCase();
    this.cancelCleanup(normalizedCode);
    const timer = setTimeout(() => {
      this.deleteRoom(normalizedCode);
      this.cleanupTimers.delete(normalizedCode);
    }, delayMs);
    this.cleanupTimers.set(normalizedCode, timer);
    // Also set cleanupTimer on the Room object for visibility
    const room = this.rooms.get(normalizedCode);
    if (room) {
      room.cleanupTimer = timer;
    }
    logger.info('RoomStore: scheduled cleanup', { code: normalizedCode, delayMs });
  }

  cancelCleanup(code: string): void {
    const normalizedCode = code.toUpperCase();
    const t = this.cleanupTimers.get(normalizedCode);
    if (t) {
      clearTimeout(t);
      this.cleanupTimers.delete(normalizedCode);
      const room = this.rooms.get(normalizedCode);
      if (room) {
        room.cleanupTimer = null;
      }
      logger.info('RoomStore: canceled cleanup', { code: normalizedCode });
    }
  }

  updateLastActivity(code: string, ts = Date.now()): void {
    const normalizedCode = code.toUpperCase();
    const r = this.rooms.get(normalizedCode);
    if (!r) return;
    r.lastActivityAt = ts;
    this.cancelCleanup(normalizedCode);
    logger.info('RoomStore: updated last activity', { code: normalizedCode, lastActivityAt: ts });
  }

  getRoomsForGroup(groupId: string): Room[] {
    const rooms: Room[] = [];
    for (const [_, room] of this.rooms) {
      if (room.groupId === groupId) {
        rooms.push(room);
      }
    }
    return rooms;
  }
}

export const roomStore = new RoomStore();
