export type GameState = 'lobby' | 'active' | 'results';

export type ConnectionStatus = 'connected' | 'disconnected';
export type ParticipantRole = 'active' | 'spectator';
export type FeedbackMode = 'supportive' | 'neutral' | 'roast';

export interface Participant {
  id: string;
  name: string;
  role: ParticipantRole;
  isReady: boolean;
  connectionStatus: ConnectionStatus;
  score: number;
  roundsWon: number;
  lastWinTimestamp: number | null;
  joinedAt: number;
  userId: string | null;
}

export interface VoteState {
  votedParticipantIds: string[]; // serialized Set for frontend
  createdAt: number;
  threshold: number;
}

export interface Room {
  code: string;
  participants: Participant[];
  gameState: GameState;
  currentQuestion: Question | null;
  currentRound: Round | null;
  usedQuestionIds: string[];
  createdAt: number;
  lastActivityAt: number;
  groupId: string | null;
  createdBy: string;
  roastMode: boolean;

  selectedCategory: string | null;
  feedbackMode: FeedbackMode;
  voteState: VoteState | null;
  cleanupTimer: number | null;
  maxActivePlayers: number;
}

export interface Question {
  id: string;
  text: string;
  choices?: string[];
  correctAnswer?: string;
  acceptedAnswers?: string[];
  category?: string | null;
}

export interface Round {
  questionId: string;
  startTime: number;
  duration: number;
  participantAnswers: ParticipantAnswer[];
  winnerId: string | null;
  endTime: number | null;
}

export interface ParticipantAnswer {
  participantId: string;
  answerText: string | null;
  timestamp: number | null;
  isCorrect: boolean;
}
