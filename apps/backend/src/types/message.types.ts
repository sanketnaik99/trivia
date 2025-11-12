import { Participant, Question, Round } from './room.types';

export interface RoomStatePayload {
  roomCode: string;
  gameState: 'lobby' | 'active' | 'results';
  participants: Array<Participant>;
  currentQuestion: Pick<Question, 'id' | 'text'> | null;
  currentRound: {
    startTime: number;
    duration: number;
    answeredCount: number;
  } | null;
  leaderboard: Array<{
    participantId: string;
    participantName: string;
    score: number;
    roundsWon: number;
    ranking: number;
  }>;
  groupId?: string | null;
  groupName?: string;
  selectedCategory?: string | null;
  feedbackMode?: 'supportive' | 'neutral' | 'roast';
  maxActivePlayers?: number;
  lastRoundResults?: {
    correctAnswer: string;
    acceptedAnswers: string[];
    winnerId: string | null;
    winnerName: string | null;
    winnerScore: number | null;
    results: Array<{
      participantId: string;
      participantName: string;
      answerText: string | null;
      timestamp: number | null;
      isCorrect: boolean;
      scoreChange: number;
      newScore: number;
    }>;
    leaderboard: Array<{
      participantId: string;
      participantName: string;
      score: number;
      roundsWon: number;
      ranking: number;
    }>;
    commentary: string[];
  } | null;
}
