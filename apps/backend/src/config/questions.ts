// Re-export questions from the repo-level workers/questions.json to avoid duplicating the file.
// This matches the plan's requirement to have questions available under apps/backend/src/config.
import questions from '../store/questions.json';

export default questions as unknown as Array<{
  id: string;
  text: string;
  correctAnswer: string;
  acceptedAnswers?: string[];
}>;
