import { Question } from './types';

/**
 * Hardcoded trivia questions for MVP
 * Questions use typed answer format with correct answer and accepted variations
 */
export const QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'What is the capital of France?',
    correctAnswer: 'Paris',
    acceptedAnswers: ['Paris'],
  },
  {
    id: 'q2',
    text: 'Who painted the Mona Lisa?',
    correctAnswer: 'Leonardo da Vinci',
    acceptedAnswers: ['Leonardo da Vinci', 'Da Vinci', 'Leonardo Di Ser Piero Da Vinci'],
  },
  {
    id: 'q3',
    text: 'What is the largest planet in our solar system?',
    correctAnswer: 'Jupiter',
    acceptedAnswers: ['Jupiter'],
  },
  {
    id: 'q4',
    text: 'What year did World War II end?',
    correctAnswer: '1945',
    acceptedAnswers: ['1945'],
  },
  {
    id: 'q5',
    text: 'What is the chemical symbol for gold?',
    correctAnswer: 'Au',
    acceptedAnswers: ['Au', 'AU'],
  },
  {
    id: 'q6',
    text: 'What is the smallest country in the world?',
    correctAnswer: 'Vatican City',
    acceptedAnswers: ['Vatican City', 'Vatican', 'The Vatican'],
  },
  {
    id: 'q7',
    text: 'How many continents are there?',
    correctAnswer: '7',
    acceptedAnswers: ['7', 'Seven', 'seven'],
  },
  {
    id: 'q8',
    text: 'What is the speed of light in meters per second? (rounded to nearest million)',
    correctAnswer: '300000000',
    acceptedAnswers: ['300000000', '3e8', '3×10^8', '300 million'],
  },
  {
    id: 'q9',
    text: 'Who wrote "Romeo and Juliet"?',
    correctAnswer: 'William Shakespeare',
    acceptedAnswers: ['William Shakespeare', 'Shakespeare', 'W. Shakespeare'],
  },
  {
    id: 'q10',
    text: 'What is the largest ocean on Earth?',
    correctAnswer: 'Pacific Ocean',
    acceptedAnswers: ['Pacific Ocean', 'Pacific', 'The Pacific'],
  },
];
