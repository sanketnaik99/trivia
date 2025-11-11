import prisma from '../config/prisma';
import { ScheduledGameStatus } from '@prisma/client';
import { AppError } from '../utils/error-handler.util';
import { roomService } from './room.service';
import { logger } from '../utils/logger.util';

export interface CreateScheduledGameData {
  title: string;
  description?: string | null;
  startAt: string; // ISO string
  durationMinutes?: number;
  recurrence?: any | null;
}

class ScheduledGameService {
  async createScheduledGame(groupId: string, createdBy: string, data: CreateScheduledGameData) {
    const { title, description, startAt, durationMinutes = 30, recurrence = null } = data;

    if (!title || title.trim().length < 1) {
      throw new AppError('VALIDATION_ERROR', 'Title is required', 400);
    }

    const start = new Date(startAt);
    if (Number.isNaN(start.getTime())) {
      throw new AppError('VALIDATION_ERROR', 'Invalid startAt timestamp', 400);
    }

    const endAt = new Date(start.getTime() + durationMinutes * 60000);

    const scheduled = await prisma.scheduledGame.create({
      data: {
        groupId,
        createdBy,
        title: title.trim(),
        description: description || null,
        startAt: start,
        endAt,
        durationMinutes,
        recurrence: recurrence || null,
      },
    });

    return scheduled;
  }

  /**
   * List upcoming scheduled games for a group. By default past games are excluded.
   * A game is considered "past" if its startAt is strictly before now. This keeps
   * the client list focused on relevant upcoming or currently starting games.
   *
   * If consumers ever need historical data we can expose includePast: true.
   */
  async listScheduledGamesForGroup(groupId: string, opts?: { includePast?: boolean }) {
    const includePast = opts?.includePast === true;
    const now = new Date();

    if (includePast) {
      return prisma.scheduledGame.findMany({
        where: { groupId },
        orderBy: { startAt: 'asc' },
      });
    }

    // Upcoming or ongoing via persisted endAt
    return prisma.scheduledGame.findMany({
      where: {
        groupId,
        endAt: { gte: now },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async getScheduledGame(id: string) {
    const sg = await prisma.scheduledGame.findUnique({ where: { id } });
    if (!sg) throw new AppError('NOT_FOUND', 'Scheduled game not found', 404);
    return sg;
  }

  async updateScheduledGame(id: string, data: Partial<CreateScheduledGameData & { status?: string }>) {
    // Allow updating title, description, startAt, durationMinutes, recurrence, status
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    const providedStart = data.startAt !== undefined ? new Date(data.startAt as string) : undefined;
    if (providedStart !== undefined) {
      if (Number.isNaN(providedStart.getTime())) throw new AppError('VALIDATION_ERROR', 'Invalid startAt', 400);
      updateData.startAt = providedStart;
    }
    if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;
    if (data.recurrence !== undefined) updateData.recurrence = data.recurrence;
    if ((data as any).status !== undefined) updateData.status = (data as any).status;

    // If either startAt or durationMinutes is being changed, recompute endAt
    if (providedStart !== undefined || data.durationMinutes !== undefined) {
      const existing = await prisma.scheduledGame.findUnique({ where: { id } });
      if (!existing) throw new AppError('NOT_FOUND', 'Scheduled game not found', 404);
      const startBase = providedStart ?? existing.startAt;
      const durationBase = data.durationMinutes ?? existing.durationMinutes ?? 30;
      updateData.endAt = new Date(new Date(startBase).getTime() + durationBase * 60000);
    }

    const updated = await prisma.scheduledGame.update({ where: { id }, data: updateData });
    return updated;
  }

  async deleteScheduledGame(id: string) {
    // Soft-cancel: set status CANCELLED
    const sg = await prisma.scheduledGame.update({ where: { id }, data: { status: 'CANCELLED' } as any });
    return sg;
  }

  /**
   * Manually start a scheduled game. This is idempotent and uses a conditional claim to avoid duplicates.
   */
  async startScheduledGame(id: string, actorUserId: string) {
    // Attempt to claim the scheduled game by flipping status=SCHEDULED -> STARTED atomically.
    const result = await prisma.scheduledGame.updateMany({
      where: { id, status: 'SCHEDULED' },
      data: { status: 'STARTED' } as any,
    });

    if (result.count === 0) {
      // Already started/cancelled; return current record
      const existing = await prisma.scheduledGame.findUnique({ where: { id } });
      if (!existing) throw new AppError('NOT_FOUND', 'Scheduled game not found', 404);
      return { alreadyStarted: true, scheduledGame: existing };
    }

    // We claimed it — create a room and persist roomId
    const sg = await prisma.scheduledGame.findUnique({ where: { id } });
    if (!sg) throw new AppError('NOT_FOUND', 'Scheduled game not found after claiming', 404);

    try {
      const { code, room } = await roomService.createRoom(actorUserId, sg.groupId || undefined);
      // Persist roomId
      const updated = await prisma.scheduledGame.update({ where: { id }, data: { roomId: room ? (room as any).code || (room as any).id || code : code } as any });

      logger.info('Scheduled game started', { scheduledGameId: id, roomCode: code });
      return { alreadyStarted: false, scheduledGame: updated, roomCode: code };
    } catch (err) {
      // Rollback: set status back to SCHEDULED to allow retry
      await prisma.scheduledGame.update({ where: { id }, data: { status: 'SCHEDULED' } as any });
      logger.error('Failed to start scheduled game', { id, error: (err as Error).message });
      throw new AppError('START_FAILED', 'Failed to start scheduled game', 500, { detail: (err as Error).message });
    }
  }
}

export const scheduledGameService = new ScheduledGameService();
