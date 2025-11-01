/**
 * Room state management utilities and answer normalization
 */

import { Participant, ParticipantAnswer } from './types';

/**
 * Normalize an answer for comparison
 * Converts to lowercase and trims whitespace
 */
export function normalizeAnswer(answer: string): string {
  return answer.toLowerCase().trim();
}

/**
 * Check if a user's answer is correct
 * Compares normalized answer against correct answer and accepted variations
 */
export function isAnswerCorrect(
  userAnswer: string,
  correctAnswer: string,
  acceptedAnswers?: string[]
): boolean {
  const normalized = normalizeAnswer(userAnswer);
  const acceptedList = acceptedAnswers || [correctAnswer];
  
  return acceptedList.some(accepted => 
    normalizeAnswer(accepted) === normalized
  );
}

/**
 * Find the winner from a list of participant answers
 * Returns the participant ID with the fastest correct answer, or null if none correct
 */
export function findWinner(
  answers: ParticipantAnswer[],
  correctAnswer: string,
  acceptedAnswers?: string[]
): string | null {
  const correctAnswers = answers.filter(answer => 
    answer.answerText && 
    answer.timestamp !== null &&
    isAnswerCorrect(answer.answerText, correctAnswer, acceptedAnswers)
  );

  if (correctAnswers.length === 0) {
    return null;
  }

  // Sort by timestamp (fastest first)
  correctAnswers.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  return correctAnswers[0].participantId;
}

/**
 * Check if all participants are ready
 */
export function allParticipantsReady(participants: Participant[]): boolean {
  return participants.length > 0 && participants.every(p => p.isReady);
}

/**
 * Check if all participants have answered
 */
export function allParticipantsAnswered(
  answers: ParticipantAnswer[],
  participantCount: number
): boolean {
  return answers.length === participantCount && 
    answers.every(a => a.answerText !== null);
}

/**
 * Calculate time remaining in milliseconds
 */
export function calculateTimeRemaining(startTime: number, duration: number): number {
  const elapsed = Date.now() - startTime;
  return Math.max(0, duration - elapsed);
}

/**
 * Format time in MM:SS format
 */
export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
