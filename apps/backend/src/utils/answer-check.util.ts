import type { Question } from '../types/room.types';

export function normalizeAnswer(a: string | null | undefined): string {
  return (a || '').trim().toLowerCase();
}

export function isAnswerCorrect(userAnswer: string | null | undefined, question: Question): boolean {
  const normalized = normalizeAnswer(userAnswer);
  if (!normalized) return false;

  const correct = normalizeAnswer(question.correctAnswer);
  if (normalized === correct) return true;

  if (Array.isArray(question.acceptedAnswers)) {
    return question.acceptedAnswers.some((alt) => normalizeAnswer(alt) === normalized);
  }

  return false;
}
