import { Room } from '../types/room.types';
import { logger } from '../utils/logger.util';

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
    logger.info('RoomStore: scheduled cleanup', { code: normalizedCode, delayMs });
  }

  cancelCleanup(code: string): void {
    const normalizedCode = code.toUpperCase();
    const t = this.cleanupTimers.get(normalizedCode);
    if (t) {
      clearTimeout(t);
      this.cleanupTimers.delete(normalizedCode);
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
}

export const roomStore = new RoomStore();
