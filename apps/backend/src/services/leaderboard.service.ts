import prisma from '../config/prisma';
import { logger } from '../utils/logger.util';

export interface LeaderboardResult {
  userId: string;
  points: number;
}

export class LeaderboardService {
  private processedGames = new Set<string>();

  async updateGroupLeaderboard(groupId: string, roomCode: string, results: LeaderboardResult[]): Promise<void> {
    logger.info('Updating group leaderboard', { groupId, roomCode, resultCount: results.length });

    // Simple duplicate prevention using in-memory set
    const processedKey = `${groupId}:${roomCode}`;
    if (this.processedGames.has(processedKey)) {
      logger.warn('Duplicate leaderboard update attempt', { roomCode, groupId });
      return;
    }
    this.processedGames.add(processedKey);

    for (const result of results) {
      // Check if user is active member of the group
      const membership = await prisma.membership.findFirst({
        where: {
          userId: result.userId,
          groupId,
          status: 'ACTIVE',
        },
      });

      if (!membership) {
        logger.info('Skipping non-member result', { userId: result.userId, groupId });
        continue;
      }

      // Upsert leaderboard entry, incrementing totalPoints
      await prisma.groupLeaderboardEntry.upsert({
        where: {
          groupId_userId: {
            userId: result.userId,
            groupId,
          },
        },
        update: {
          totalPoints: {
            increment: result.points,
          },
          lastUpdated: new Date(),
        },
        create: {
          userId: result.userId,
          groupId,
          totalPoints: result.points,
          lastUpdated: new Date(),
        },
      });

      logger.info('Updated leaderboard entry', { userId: result.userId, groupId, pointsAdded: result.points });
    }

    logger.info('Group leaderboard updated successfully', { groupId, roomCode });
  }
}

export const leaderboardService = new LeaderboardService();