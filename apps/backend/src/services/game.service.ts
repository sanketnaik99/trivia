import { Server, Socket } from 'socket.io';
import { roomStore } from '../store/room.store';
import { Question, Room } from '../types/room.types';
import { questionService } from './question.service';
import { logger } from '../utils/logger.util';
import { leaderboardService } from './leaderboard.service';
import prisma from '../config/prisma';

class GameService {
  private roundTimers: Map<string, NodeJS.Timeout> = new Map();
  private countdownTimers: Map<string, NodeJS.Timeout> = new Map();

  // T048: Calculate leaderboard with tie-breaker by lastWinTimestamp (most recent wins rank higher)
  calculateLeaderboard(room: Room) {
    const participants = Array.from(room.participants.values());
    return participants
      .map((p) => ({
        participantId: p.id,
        participantName: p.name,
        score: p.score,
        roundsWon: p.roundsWon,
        lastWinTimestamp: p.lastWinTimestamp ?? 0,
      }))
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score; // primary: score desc
        return (b.lastWinTimestamp || 0) - (a.lastWinTimestamp || 0); // tie-breaker: most recent win first
      })
      .map((p, i) => ({
        participantId: p.participantId,
        participantName: p.participantName,
        score: p.score,
        roundsWon: p.roundsWon,
        ranking: i + 1,
      }));
  }

  handleReady(io: Server, socket: Socket, payload: { isReady: boolean }) {
  const s = socket as Socket & { data: { roomCode?: string; playerId?: string } };
  const roomCode = s.data.roomCode;
  const playerId = s.data.playerId;
    logger.info('READY event received', { roomCode, playerId, isReady: payload.isReady, socketId: socket.id });
    if (!roomCode || !playerId) {
      return socket.emit('ERROR', { code: 'NOT_JOINED', message: 'Not joined' });
    }
    const room = roomStore.getRoom(roomCode);
    if (!room) return socket.emit('ERROR', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    if (room.gameState !== 'lobby' && room.gameState !== 'results') {
      return socket.emit('ERROR', { code: 'INVALID_STATE', message: 'Invalid state' });
    }
    const p = room.participants.get(playerId);
    if (!p) return socket.emit('ERROR', { code: 'NOT_JOINED', message: 'Not joined' });
    p.isReady = !!payload.isReady;
    io.to(roomCode).emit('PLAYER_READY', { playerId, isReady: p.isReady });

    const participants = Array.from(room.participants.values());
    const allReady = participants.length >= 2 && participants.every((pp) => pp.isReady);
    if (allReady) {
      // start 5s countdown then game start
      if (this.countdownTimers.has(roomCode)) return; // already counting down
      const t = setTimeout(() => {
        this.countdownTimers.delete(roomCode);
        try {
          this.startGame(io, roomCode);
        } catch (e) {
          logger.error('Failed to start game', { roomCode, error: (e as Error).message });
        }
      }, 5000);
      this.countdownTimers.set(roomCode, t);
    }
  }

  startGame(io: Server, roomCode: string) {
    const room = roomStore.getRoom(roomCode);
    if (!room) throw new Error('ROOM_NOT_FOUND');
    const q = questionService.getRandomUnusedQuestionForRoom(room);
    if (!q) throw new Error('NO_QUESTIONS');
    room.currentQuestion = q;
    room.currentRound = {
      questionId: q.id,
      startTime: Date.now(),
      duration: 180000,
      participantAnswers: [],
      winnerId: null,
      endTime: null,
    };
    room.gameState = 'active';
    // reset ready flags
    for (const p of room.participants.values()) p.isReady = false;

    io.to(roomCode).emit('GAME_START', {
      question: { id: q.id, text: q.text },
      startTime: room.currentRound.startTime,
      duration: room.currentRound.duration,
    });

    // auto-end timer
    const timer = setTimeout(async () => {
      try {
        await this.endRound(io, roomCode);
      } catch (e) {
        logger.error('Failed to end round automatically', { roomCode, error: (e as Error).message });
      }
    }, room.currentRound.duration);
    this.roundTimers.set(roomCode, timer);
  }

  async handleAnswer(io: Server, socket: Socket, payload: { answerText: string; timestamp: number }) {
    const start = Date.now();
  const s = socket as Socket & { data: { roomCode?: string; playerId?: string } };
  const roomCode = s.data.roomCode;
  const playerId = s.data.playerId;
    if (!roomCode || !playerId) return socket.emit('ERROR', { code: 'NOT_JOINED', message: 'Not joined' });
    const room = roomStore.getRoom(roomCode);
    if (!room || !room.currentRound || !room.currentQuestion || room.gameState !== 'active') {
      return socket.emit('ERROR', { code: 'INVALID_STATE', message: 'Invalid state' });
    }
    const already = room.currentRound.participantAnswers.find((a) => a.participantId === playerId);
    if (already) return socket.emit('ERROR', { code: 'ALREADY_ANSWERED', message: 'Already answered' });

    const ts = Math.max(0, Math.min(180000, Number(payload.timestamp || 0)));
    const answerText = (payload.answerText || '').toString();
    const isCorrect = this.normalize(answerText) === this.normalize(room.currentQuestion.correctAnswer)
      || (room.currentQuestion.acceptedAnswers || []).some(a => this.normalize(a) === this.normalize(answerText));

  room.currentRound.participantAnswers.push({ participantId: playerId, answerText, timestamp: ts, isCorrect });

  // T082: Log answer processing time
  const dur = Date.now() - start;
  logger.info('Processed ANSWER', { roomCode, playerId, isCorrect, ts, ms: dur });

    socket.emit('ANSWER_SUBMITTED', { answerText, timestamp: ts });
    const answeredCount = room.currentRound.participantAnswers.length;
    const totalCount = room.participants.size;
    io.to(roomCode).emit('ANSWER_COUNT_UPDATE', { answeredCount, totalCount });

    if (answeredCount >= totalCount) {
      await this.endRound(io, roomCode);
    }
  }

  async endRound(io: Server, roomCode: string) {
    const room = roomStore.getRoom(roomCode);
    if (!room || !room.currentRound || !room.currentQuestion) return;
    const round = room.currentRound;
    round.endTime = Date.now();
    clearTimeout(this.roundTimers.get(roomCode) as NodeJS.Timeout);
    this.roundTimers.delete(roomCode);

    // Winner = fastest correct
    let winnerId: string | null = null;
    let bestTs = Number.MAX_SAFE_INTEGER;
    for (const a of round.participantAnswers) {
      if (a.isCorrect && a.timestamp !== null && a.timestamp < bestTs) {
        bestTs = a.timestamp;
        winnerId = a.participantId;
      }
    }
    round.winnerId = winnerId;
    if (winnerId) {
      const p = room.participants.get(winnerId);
      if (p) {
        // T047: increment winner's score and roundsWon, set lastWinTimestamp
        p.score += 1;
        p.roundsWon += 1;
        p.lastWinTimestamp = Date.now();
      }
    }

    // Build results
    const results = round.participantAnswers.map((a) => {
      const p = room.participants.get(a.participantId)!;
      const scoreChange = a.participantId === winnerId ? 1 : 0;
      const newScore = p.score;
      return {
        participantId: a.participantId,
        participantName: p.name,
        answerText: a.answerText,
        timestamp: a.timestamp,
        isCorrect: a.isCorrect,
        scoreChange,
        newScore,
      };
    });

    // T048: Use calculateLeaderboard for consistent sorting and fields
    const leaderboard = this.calculateLeaderboard(room);

    io.to(roomCode).emit('ROUND_END', {
      correctAnswer: room.currentQuestion.correctAnswer,
      acceptedAnswers: room.currentQuestion.acceptedAnswers || [],
      winnerId,
      // T051: Include winnerName and winnerScore for convenience
      winnerName: winnerId ? room.participants.get(winnerId)?.name || null : null,
      winnerScore: winnerId ? room.participants.get(winnerId)?.score || null : null,
      results,
      leaderboard,
    });

    // Reset for next round
    room.currentQuestion = null;
    room.currentRound = null;
    room.gameState = 'results';
    
    // Reset all isReady flags when transitioning to results
    for (const p of room.participants.values()) {
      p.isReady = false;
    }
    
  // Broadcast updated room state with reset ready flags
    const participants = Array.from(room.participants.values());
    // T050: Include leaderboard in ROOM_STATE
    let groupName: string | undefined;
    if (room.groupId) {
      const group = await prisma.group.findUnique({
        where: { id: room.groupId },
        select: { name: true },
      });
      groupName = group?.name;
    }

    io.to(roomCode).emit('ROOM_STATE', {
      roomCode,
      gameState: room.gameState,
      participants,
      currentQuestion: null,
      currentRound: null,
      leaderboard,
      groupId: room.groupId,
      groupName,
    });

    // T082: Log round duration and stats
    const roundDuration = (round.endTime || Date.now()) - (round.startTime || Date.now());
    logger.info('Round ended', {
      roomCode,
      winnerId,
      answers: round.participantAnswers.length,
      durationMs: roundDuration,
    });

    // Update group leaderboard after each round for group rooms
    if (room.groupId) {
      try {
        // Convert round results to leaderboard format
        const leaderboardResults = results
          .filter(r => r.scoreChange > 0) // Only winners get points
          .map(r => {
            const participant = room.participants.get(r.participantId);
            return {
              userId: participant?.userId || '',
              points: r.scoreChange,
            };
          })
          .filter(r => r.userId); // Filter out anonymous users

        if (leaderboardResults.length > 0) {
          const updateResult = await leaderboardService.updateGroupLeaderboard(room.groupId, roomCode, leaderboardResults);
          
          // Broadcast leaderboard updated to group members
          io.to(`group:${room.groupId}`).emit('leaderboard:updated', {
            groupId: room.groupId,
            timestamp: Date.now(),
            updates: updateResult.updates,
            topThree: updateResult.topThree,
          });

          logger.info('Group leaderboard updated after round', { roomCode, groupId: room.groupId, winners: leaderboardResults.length });
        }
      } catch (err: unknown) {
        logger.error('Group leaderboard update failed after round', { roomCode, groupId: room.groupId, error: (err as Error).message });
      }
    }
  }

  private normalize(s: string) {
    return (s || '').toString().trim().toLowerCase();
  }
}

export const gameService = new GameService();
