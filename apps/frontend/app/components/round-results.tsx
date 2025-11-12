import React, { useState } from 'react';
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
  commentary?: string;
  currentUserRole?: 'active' | 'spectator';
  onJoinAsParticipant?: () => void;
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
  commentary,
  currentUserRole,
  onJoinAsParticipant,
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
      
      {commentary && (
        <div className="mt-4 w-full">
          <div className="relative bg-linear-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="absolute -top-3 -left-2 mt-0.5">
                <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-semibold">
                  Trivia AI
                </Badge>
              </div>
              <p className="text-sm md:text-base text-gray-800 dark:text-gray-200 leading-relaxed flex-1">
                {commentary}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="text-lg font-semibold mt-4 mb-2 text-center">
        Correct Answer: <span className="text-green-600">{correctAnswer}</span>
        {acceptedAnswers.length > 1 && (
          <span className="text-gray-500 text-sm ml-2">(Also accepted: {acceptedAnswers.filter(a => a !== correctAnswer).join(', ')})</span>
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
      {(onReadyForNextRound || onJoinAsParticipant) && (
        <div className="mt-6 w-full space-y-3">
          {/* Show all players ready status when at least one is ready */}
          {readyCount > 0 && currentUserRole !== 'spectator' && (
            <div className="text-center space-y-2">
              {allReady ? (
                <div className="p-3 bg-green-100 text-green-800 rounded-md font-medium">
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
            {currentUserRole === 'spectator' && onJoinAsParticipant ? (
              <Button
                onClick={onJoinAsParticipant}
                variant="default"
                size="lg"
              >
                Join as Participant
              </Button>
            ) : onReadyForNextRound ? (
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
            ) : null}
          </div>
        </div>
      )}
      
      {/* Confetti animation for winner */}
      {winnerId && (
        <ConfettiCelebration />
      )}
    </div>
  );
}

// Simple confetti animation (CSS only, for demo)
const confettiCount = 30;
const ConfettiCelebration = () => {
  const [confettiDelays] = useState(() => Array.from({ length: confettiCount }, () => Math.random() * 1.5));
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center">
      <div className="confetti w-full h-32 flex flex-wrap justify-center">
        {[...Array(confettiCount)].map((_, i) => (
          <span
            key={i}
            className="inline-block w-2 h-4 rounded-sm mx-1 animate-confetti"
            style={{
              backgroundColor: confettiColors[i % confettiColors.length],
              animationDelay: `${confettiDelays[i]}s`,
            }}
          />
        ))}
      </div>
      <style jsx>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120px) rotate(360deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 1.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
const confettiColors = [
  '#FFD700', '#FF69B4', '#00CFFF', '#FF6347', '#32CD32', '#FFA500', '#8A2BE2', '#FF4500', '#00FA9A', '#1E90FF',
];

export default RoundResults;
