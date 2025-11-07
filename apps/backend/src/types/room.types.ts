export type GameState = 'lobby' | 'active' | 'results';

export type ConnectionStatus = 'connected' | 'disconnected';

export type ParticipantRole = 'active' | 'spectator';

export type FeedbackMode = 'supportive' | 'neutral' | 'roast';

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;               // 'active' can answer, 'spectator' watches only
  isReady: boolean;
  connectionStatus: ConnectionStatus;
  // Optional socket id for the participant's active socket connection
  socketId?: string | null;
  score: number;
  roundsWon: number;
  lastWinTimestamp: number | null;
  joinedAt: number;
  userId: string | null;
}

export interface Question {
  id: string;
  text: string;
  correctAnswer: string;
  acceptedAnswers?: string[];
}

export interface ParticipantAnswer {
  participantId: string;
  answerText: string | null;
  timestamp: number | null;
  isCorrect: boolean;
}

export interface Round {
  questionId: string;
  startTime: number;
  duration: number;
  participantAnswers: ParticipantAnswer[];
  winnerId: string | null;
  endTime: number | null;
}

export interface Room {
  code: string;
  participants: Map<string, Participant>;
  gameState: GameState;
  currentQuestion: Question | null;
  currentRound: Round | null;
  usedQuestionIds: string[];
  createdAt: number;
  lastActivityAt: number;
  groupId: string | null;
  createdBy: string;
  // Deprecated - kept for backwards compatibility
  roastMode: boolean;

  // New fields
  selectedCategory: string | null;
  feedbackMode: FeedbackMode;
  voteState: import('./game.types').VoteState | null;
  cleanupTimer: NodeJS.Timeout | null;
  maxActivePlayers: number;
}
