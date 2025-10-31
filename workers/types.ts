/**
 * TypeScript types for WebSocket message protocol
 * Defines message structure between client and server
 */

// Client → Server Messages
export type ClientMessage =
  | { type: 'JOIN'; payload: { playerId: string; playerName: string } }
  | { type: 'READY'; payload: { isReady: boolean } }
  | { type: 'ANSWER'; payload: { answerText: string; timestamp: number } }
  | { type: 'LEAVE'; payload: Record<string, never> };

// Server → Client Messages
export type ServerMessage =
  | { type: 'ROOM_STATE'; payload: RoomStatePayload }
  | { type: 'PLAYER_JOINED'; payload: { participant: Participant } }
  | { type: 'PLAYER_READY'; payload: { playerId: string; isReady: boolean } }
  | { type: 'GAME_START'; payload: GameStartPayload }
  | { type: 'ANSWER_SUBMITTED'; payload: { answerText: string; timestamp: number } }
  | { type: 'ANSWER_COUNT_UPDATE'; payload: { answeredCount: number; totalCount: number } }
  | { type: 'ROUND_END'; payload: RoundEndPayload }
  | { type: 'PLAYER_LEFT'; payload: { playerId: string; playerName: string } }
  | { type: 'ERROR'; payload: { code: string; message: string } };

// Payload interfaces
export interface Participant {
  id: string;
  name: string;
  isReady: boolean;
  connectionStatus: string;
}

export interface Question {
  id: string;
  text: string;
}

export interface RoomStatePayload {
  roomCode: string;
  gameState: 'lobby' | 'active' | 'results';
  participants: Participant[];
  currentQuestion: Question | null;
  currentRound: CurrentRound | null;
}

export interface CurrentRound {
  startTime: number;
  duration: number;
  answeredCount: number;
}

export interface GameStartPayload {
  question: Question;
  startTime: number;
  duration: number;
}

export interface ResultEntry {
  participantId: string;
  participantName: string;
  answerText: string | null;
  timestamp: number | null;
  isCorrect: boolean;
}

export interface RoundEndPayload {
  correctAnswer: string;
  acceptedAnswers: string[];
  winnerId: string | null;
  results: ResultEntry[];
}
