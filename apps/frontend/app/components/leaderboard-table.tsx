'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LeaderboardEntry } from '@/app/lib/api/schemas/group.schema';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  isLoading?: boolean;
  updatedAt?: Date | null;
  currentUserId?: string;
}

export function LeaderboardTable({ entries, isLoading, updatedAt, currentUserId }: LeaderboardTableProps) {
  // Simple visual feedback - highlight if updated recently
  const isRecentlyUpdated = updatedAt && (new Date().getTime() - updatedAt.getTime()) < 3000;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded animate-pulse w-32" />
              <div className="h-3 bg-muted rounded animate-pulse w-24" />
            </div>
            <div className="h-6 bg-muted rounded animate-pulse w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No games played yet</h3>
        <p className="text-muted-foreground">
          Create a trivia room to get started and see your group&apos;s leaderboard!
        </p>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-semibold text-muted-foreground w-5 text-center">{rank}</span>;
    }
  };

  return (
    <div className={`space-y-4 transition-all duration-500 ${isRecentlyUpdated ? 'ring-2 ring-green-200 ring-opacity-50' : ''}`}>
      {entries.map((entry) => (
        <div
          key={entry.userId}
          className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
            entry.userId === currentUserId ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : ''
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-10">
              {getRankIcon(entry.rank)}
            </div>
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {entry.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{entry.displayName}</div>
              <div className="text-sm text-muted-foreground">
                Last updated {new Date(entry.lastUpdated).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {entry.totalPoints.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">points</div>
          </div>
        </div>
      ))}
    </div>
  );
}