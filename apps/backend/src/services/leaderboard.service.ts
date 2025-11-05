import prisma from '../config/prisma';
import { logger } from '../utils/logger.util';

export interface LeaderboardResult {
  userId: string;
  points: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalPoints: number;
  gamesPlayed?: number; // If we track this later
  lastUpdated: Date;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  groupInfo: {
    id: string;
    name: string;
    totalGamesPlayed: number;
  };
}

export interface LeaderboardUpdateResult {
  updates: Array<{
    userId: string;
    newTotal: number;
    pointsAdded: number;
  }>;
  topThree: Array<{
    userId: string;
    displayName: string;
    totalPoints: number;
  }>;
}

export class LeaderboardService {

  async updateGroupLeaderboard(groupId: string, roomCode: string, results: LeaderboardResult[]): Promise<LeaderboardUpdateResult> {
    logger.info('Updating group leaderboard', { groupId, roomCode, resultCount: results.length });

    const updates: LeaderboardUpdateResult['updates'] = [];

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

      // Get current total before update
      const currentEntry = await prisma.groupLeaderboardEntry.findUnique({
        where: {
          groupId_userId: {
            userId: result.userId,
            groupId,
          },
        },
      });

      const previousTotal = currentEntry?.totalPoints || 0;

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

      updates.push({
        userId: result.userId,
        newTotal: previousTotal + result.points,
        pointsAdded: result.points,
      });

      logger.info('Updated leaderboard entry', { userId: result.userId, groupId, pointsAdded: result.points });
    }

    // Get top three after updates
    const topThreeEntries = await prisma.groupLeaderboardEntry.findMany({
      where: { groupId },
      include: {
        user: {
          select: { displayName: true },
        },
      },
      orderBy: { totalPoints: 'desc' },
      take: 3,
    });

    const topThree = topThreeEntries.map((entry: any) => ({
      userId: entry.userId,
      displayName: entry.user.displayName,
      totalPoints: entry.totalPoints,
    }));

    logger.info('Group leaderboard updated successfully', { groupId, roomCode });

    return { updates, topThree };
  }

  async getGroupLeaderboard(
    groupId: string,
    options: {
      page: number;
      limit: number;
      sortBy: 'totalPoints' | 'lastUpdated';
      order: 'asc' | 'desc';
    }
  ): Promise<LeaderboardResponse> {
    const { page, limit, sortBy, order } = options;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.groupLeaderboardEntry.count({
      where: { groupId },
    });

    // Fetch entries with user data
    const entries = await prisma.groupLeaderboardEntry.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        [sortBy]: order,
      },
      skip,
      take: limit,
    });

    // Calculate ranks - for now, simple ranking (ties get same rank)
    // In a real implementation, you'd use window functions
    const allEntries = await prisma.groupLeaderboardEntry.findMany({
      where: { groupId },
      orderBy: {
        totalPoints: 'desc',
      },
      select: {
        userId: true,
        totalPoints: true,
      },
    });

    const rankMap = new Map<string, number>();
    let currentRank = 1;
    let previousPoints = -1;

    for (const entry of (allEntries as any[])) {
      if (entry.totalPoints !== previousPoints) {
        currentRank = rankMap.size + 1;
        previousPoints = entry.totalPoints;
      }
      rankMap.set(entry.userId, currentRank);
    }

    // Get group info
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        name: true,
        _count: {
          select: {
            rooms: true, // This counts all rooms, but we want completed games
          },
        },
      },
    });

    if (!group) {
      throw new Error('Group not found');
    }

    // For now, approximate totalGamesPlayed as number of rooms with this groupId
    // In a real implementation, you'd track completed games separately
    const totalGamesPlayed = group._count.rooms;

    const leaderboard: LeaderboardEntry[] = entries.map((entry: any) => ({
      rank: rankMap.get(entry.userId) || 0,
      userId: entry.userId,
      displayName: entry.user.displayName,
      avatarUrl: entry.user.avatarUrl,
      totalPoints: entry.totalPoints,
      lastUpdated: entry.lastUpdated,
    }));

    return {
      leaderboard,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      groupInfo: {
        id: groupId,
        name: group.name,
        totalGamesPlayed,
      },
    };
  }
}

export const leaderboardService = new LeaderboardService();