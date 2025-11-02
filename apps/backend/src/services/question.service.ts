import questions from '../config/questions';
import type { Question, Room } from '../types/room.types';

export class QuestionService {
  private questions: Question[] = questions as Question[];

  getRandomUnusedQuestionForRoom(room: Room): Question | null {
    const unused = this.questions.filter((q) => !room.usedQuestionIds.includes(q.id));
    if (unused.length === 0) {
      // reset used list and allow reuse
      room.usedQuestionIds = [];
      return this.getRandomUnusedQuestionForRoom(room);
    }
    const pick = unused[Math.floor(Math.random() * unused.length)];
    room.usedQuestionIds.push(pick.id);
    return pick;
  }
}

export const questionService = new QuestionService();
