"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface LeaderboardEntry {
  participantId: string;
  participantName: string;
  score: number;
  roundsWon: number;
  ranking: number;
}

interface LeaderboardProps {
  title?: string;
  leaderboard: LeaderboardEntry[];
}

export function Leaderboard({ title = 'Leaderboard', leaderboard }: LeaderboardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground">No players yet.</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <div
                key={entry.participantId}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-semibold shrink-0 w-6 text-center">{entry.ranking}</span>
                  <span className="truncate">{entry.participantName}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-sm">
                  <span className="tabular-nums">{entry.score} pt{entry.score === 1 ? '' : 's'}</span>
                  <span className="text-muted-foreground">{entry.roundsWon} win{entry.roundsWon === 1 ? '' : 's'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default Leaderboard;
