import type { Question as QType, Room } from '../types/room.types';
import prisma from '../config/prisma';

export class QuestionService {
  // DB-backed questions via Prisma

  // Return categories with counts from the database when available, otherwise from the JSON
  async getCategoriesWithCount(): Promise<Array<{ category: string | null; count: number }>> {
    // Always use DB-backed questions. Let errors propagate so callers can surface failures.
    // Use any to avoid requiring prisma client codegen in this patch run
    const grouped: any[] = await (prisma as any).question.groupBy({
      by: ['category'],
      _count: { _all: true },
    });
    return grouped.map((g: any) => ({ category: g.category, count: g._count._all }));
  }

  // Fetch questions by category (DB preferred)
  async getQuestionsByCategory(category: string | null): Promise<QType[]> {
    // Always fetch from DB. Let errors bubble up so caller can handle them.
    if (category) {
      const rows: any[] = await (prisma as any).question.findMany({ where: { category } });
      return rows.map((r: any) => ({ id: r.id, text: r.text, correctAnswer: r.correctAnswer ?? null, acceptedAnswers: r.acceptedAnswers ?? [], category: r.category } as QType));
    }

    const rows: any[] = await (prisma as any).question.findMany();
    return rows.map((r: any) => ({ id: r.id, text: r.text, correctAnswer: r.correctAnswer ?? null, acceptedAnswers: r.acceptedAnswers ?? [], category: r.category } as QType));
  }

  // Select a random unused question for the room, honoring selectedCategory when present
  async getRandomUnusedQuestionForRoom(room: Room): Promise<QType | null> {
    // More efficient DB-backed selection:
    // 1) Count eligible rows using filters (category + excluding used IDs)
    // 2) Choose a random offset and select a single row with skip/limit
    // This avoids loading the entire table into memory.

    const baseWhere: any = {};
    if (room.selectedCategory) baseWhere.category = room.selectedCategory;

    // Exclude used IDs if any
    const usedIds = Array.isArray(room.usedQuestionIds) ? room.usedQuestionIds : [];
    const whereWithExclusion = usedIds.length > 0 ? { ...baseWhere, id: { notIn: usedIds } } : baseWhere;

    // Count eligible
    let count = await (prisma as any).question.count({ where: whereWithExclusion });

    if (count === 0) {
      // No unused questions left. Reset used list and try again (allow reuse).
      room.usedQuestionIds = [];
      count = await (prisma as any).question.count({ where: baseWhere });
      if (count === 0) return null; // no questions available at all
      const rand = Math.floor(Math.random() * count);
      const rows: any[] = await (prisma as any).question.findMany({ where: baseWhere, skip: rand, take: 1 });
      const pick = rows[0];
      if (!pick) return null;
      room.usedQuestionIds.push(pick.id);
      return { id: pick.id, text: pick.text, correctAnswer: pick.correctAnswer ?? null, acceptedAnswers: pick.acceptedAnswers ?? [], category: pick.category } as QType;
    }

    const rand = Math.floor(Math.random() * count);
    const rows: any[] = await (prisma as any).question.findMany({ where: whereWithExclusion, skip: rand, take: 1 });
    const pick = rows[0];
    if (!pick) return null;
    room.usedQuestionIds.push(pick.id);
    return { id: pick.id, text: pick.text, correctAnswer: pick.correctAnswer ?? null, acceptedAnswers: pick.acceptedAnswers ?? [], category: pick.category } as QType;
  }
}

export const questionService = new QuestionService();
