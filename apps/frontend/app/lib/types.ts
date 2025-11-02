// Core types for the Trivia Room System

export type GameState = 'lobby' | 'active' | 'results';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface Participant {
  id: string;
  name: string;
  isReady: boolean;
  connectionStatus: ConnectionStatus;
  score?: number;
  roundsWon?: number;
  lastWinTimestamp?: number | null;
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
  answers: ParticipantAnswer[];
  winnerId: string | null;
}

export interface Room {
  code: string;
  participants: Participant[];
  gameState: GameState;
  currentQuestion: Question | null;
  currentRound: Round | null;
  usedQuestionIds: string[];
}
