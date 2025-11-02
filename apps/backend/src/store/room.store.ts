import { Room } from '../types/room.types';
import { logger } from '../utils/logger.util';

export class RoomStore {
  private rooms: Map<string, Room> = new Map();
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();

  createRoom(code: string, room: Room): Room {
    this.rooms.set(code, room);
    logger.info('RoomStore: created room', { code });
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  deleteRoom(code: string): void {
    this.cancelCleanup(code);
    this.rooms.delete(code);
    logger.info('RoomStore: deleted room', { code });
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  scheduleCleanup(code: string, delayMs: number): void {
    this.cancelCleanup(code);
    const timer = setTimeout(() => {
      this.deleteRoom(code);
      this.cleanupTimers.delete(code);
    }, delayMs);
    this.cleanupTimers.set(code, timer);
    logger.info('RoomStore: scheduled cleanup', { code, delayMs });
  }

  cancelCleanup(code: string): void {
    const t = this.cleanupTimers.get(code);
    if (t) {
      clearTimeout(t);
      this.cleanupTimers.delete(code);
      logger.info('RoomStore: canceled cleanup', { code });
    }
  }

  updateLastActivity(code: string, ts = Date.now()): void {
    const r = this.rooms.get(code);
    if (!r) return;
    r.lastActivityAt = ts;
    this.cancelCleanup(code);
    logger.info('RoomStore: updated last activity', { code, lastActivityAt: ts });
  }
}

export const roomStore = new RoomStore();
