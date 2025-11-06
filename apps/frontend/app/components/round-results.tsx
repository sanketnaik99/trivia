"use client";

import React from 'react';
import WinnerBanner from './winner-banner';
import PlayerResultCard from './player-result-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Participant } from '@/app/lib/types';
import type { LeaderboardEntry } from './leaderboard';

interface PlayerResult {
  participantId: string;
  participantName: string;
  answerText: string | null;
  timestamp: number | null;
  isCorrect: boolean;
  scoreChange?: number;
  newScore?: number;
}

interface RoundResultsProps {
  correctAnswer: string;
  acceptedAnswers: string[];
  winnerId: string | null;
  results: PlayerResult[];
  currentUserId: string;
  participants?: Participant[];
  onReadyForNextRound?: () => void;
  leaderboard?: LeaderboardEntry[];
  groupId?: string;
}

const RoundResults: React.FC<RoundResultsProps> = ({
  correctAnswer,
  acceptedAnswers,
  winnerId,
  results,
  currentUserId,
  participants,
  onReadyForNextRound,
  groupId,
}) => {
  // Sort: correct first, then by timestamp (fastest), then incorrect
  const sortedResults = [...results].sort((a, b) => {
    if (a.isCorrect !== b.isCorrect) return a.isCorrect ? -1 : 1;
    if (a.isCorrect && b.isCorrect) {
      if (a.timestamp === null) return 1;
      if (b.timestamp === null) return -1;
      return a.timestamp - b.timestamp;
    }
    return 0;
  });

  // Get current user's ready status
  const currentUser = participants?.find(p => p.id === currentUserId);
  const isCurrentUserReady = currentUser?.isReady || false;

  // Count ready players
  const readyCount = participants?.filter(p => p.isReady).length || 0;
  const totalCount = participants?.length || 0;
  const allReady = readyCount === totalCount && totalCount > 1;

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto p-4">
        <WinnerBanner winnerId={winnerId} results={results} participants={participants} />
        <div className="text-lg font-semibold mt-4 mb-2 text-center">
          Correct Answer: <span className="text-accent-foreground">{correctAnswer}</span>
          {acceptedAnswers.length > 1 && (
            <span className="text-muted-foreground text-sm ml-2">(Also accepted: {acceptedAnswers.filter(a => a !== correctAnswer).join(', ')})</span>
          )}
        </div>
      {participants?.some(p => p.isGroupMember === false) && (
        <div className="text-center text-sm text-muted-foreground mb-4">
          Note: Only group member points count toward the leaderboard.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-4">
        {sortedResults.map(result => {
          const participant = participants?.find(p => p.id === result.participantId);
          const isGroupMember = participant?.isGroupMember;
          return (
            <PlayerResultCard
              key={result.participantId}
              result={result}
              highlight={result.participantId === currentUserId}
              isGroupMember={isGroupMember}
            />
          );
        })}
      </div>
      
      {/* T100: Ready for Next Round button with status */}
    {onReadyForNextRound && (
        <div className="mt-6 w-full space-y-3">
          {/* Show all players ready status when at least one is ready */}
          {readyCount > 0 && (
            <div className="text-center space-y-2">
              {allReady ? (
                <div className="p-3 bg-accent/10 text-accent-foreground rounded-md font-medium">
                  All players ready! Starting next round...
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {readyCount}/{totalCount} players ready for next round
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-2 justify-center">
            {groupId && (
              <Button
                onClick={() => window.location.href = `/groups/${groupId}/leaderboard`}
                variant="outline"
                size="lg"
              >
                View Group Leaderboard
              </Button>
            )}
            <Button
              onClick={onReadyForNextRound}
              variant={isCurrentUserReady ? 'outline' : 'default'}
              size="lg"
              disabled={allReady}
            >
              {isCurrentUserReady ? (
                <>
                  <Badge variant="secondary" className="mr-2">✓</Badge>
                  Waiting for Others...
                </>
              ) : (
                'Ready for Next Round'
              )}
            </Button>
          </div>
        </div>
      )}
      
      {/* Confetti animation for winner */}
      {/* Winner confetti removed to respect reduced-motion and reduce decorative animation */}
    </div>
  );
}

// Confetti was removed per animation-cleanup/a11y requirements

export default RoundResults;
