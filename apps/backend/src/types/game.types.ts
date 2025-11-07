export interface GameStartPayload {
  question: { id: string; text: string };
  startTime: number;
  duration: number;
}

export interface RoundEndResult {
  correctAnswer: string;
  acceptedAnswers: string[];
  winnerId: string | null;
  winnerName: string | null;
  commentary?: string;
}

// Vote state for vote-to-end-game feature
export interface VoteState {
  votedParticipantIds: Set<string>;
  createdAt: number;
  threshold: number;
}
