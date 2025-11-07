// Core types for the Trivia Room System

export type GameState = 'lobby' | 'active' | 'results';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface Participant {
  id: string;
  name: string;
  isReady: boolean;
  connectionStatus: ConnectionStatus;
  // 'active' = can play and answer questions, 'spectator' = watching only
  role?: 'active' | 'spectator';
  score?: number;
  roundsWon?: number;
  lastWinTimestamp?: number | null;
  isGroupMember?: boolean;
  userId?: string | null;
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

// ============================================================================
// Authentication, Groups, and Leaderboards Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  privacy: 'PRIVATE';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  creator?: User;
  memberCount?: number;
}

export interface Membership {
  id: string;
  userId: string;
  groupId: string;
  role: 'ADMIN' | 'MEMBER';
  status: 'ACTIVE' | 'LEFT' | 'REMOVED';
  joinedAt: Date;
  updatedAt: Date;
  user?: User;
  group?: Group;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  token: string;
  createdBy: string;
  expiresAt: Date;
  status: 'ACTIVE' | 'USED' | 'REVOKED' | 'EXPIRED';
  createdAt: Date;
  updatedAt: Date;
  group?: Group;
  creator?: User;
}

export interface GroupLeaderboardEntry {
  id: string;
  groupId: string;
  userId: string;
  totalPoints: number;
  lastUpdated: Date;
  user?: User;
  group?: Group;
}

// API Response types
export interface GroupWithRole extends Group {
  role: 'ADMIN' | 'MEMBER';
  joinedAt: Date;
}

export interface GroupDetail extends Group {
  userRole: 'ADMIN' | 'MEMBER';
  members: Array<{
    userId: string;
    displayName: string;
    avatarUrl?: string;
    role: 'ADMIN' | 'MEMBER';
    joinedAt: Date;
  }>;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  totalPoints: number;
  gamesPlayed?: number;
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

// API Response wrappers
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface CreateGroupResponse {
  group: Group;
  membership: Membership;
}

export interface GroupsListResponse {
  groups: GroupWithRole[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Backend API response structure (wrapped in success/data)
export interface BackendApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
