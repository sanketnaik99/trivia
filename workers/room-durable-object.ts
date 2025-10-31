/**
 * Cloudflare Durable Object for managing trivia room state
 * Handles WebSocket connections and room game logic
 */

import { ClientMessage, ServerMessage, Participant } from './types';
import questionsData from './questions.json';

interface Question {
  id: string;
  text: string;
  correctAnswer: string;
  acceptedAnswers?: string[];
}

interface ParticipantAnswer {
  participantId: string;
  answerText: string | null;
  timestamp: number | null;
  isCorrect: boolean;
}

interface Round {
  questionId: string;
  startTime: number;
  duration: number;
  participantAnswers: ParticipantAnswer[];
  winnerId: string | null;
  endTime: number | null;
}

interface Env {
  ROOMS: DurableObjectNamespace;
}

type RawQuestion = {
  id: string;
  text: string;
  correctAnswer: string;
  acceptedAnswers?: string[];
};

const MAX_PARTICIPANTS = 8;
const GAME_START_DELAY = 15000; // 15 seconds countdown before game starts
const ROUND_DURATION = 180000; // 3 minutes in milliseconds

// Load questions from JSON source
const QUESTIONS: Question[] = (questionsData as RawQuestion[])
  .filter((q) => q && typeof q.id === 'string' && typeof q.text === 'string' && typeof q.correctAnswer === 'string')
  .map((q) => ({
    id: q.id as string,
    text: q.text as string,
    correctAnswer: q.correctAnswer as string,
    acceptedAnswers: Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length > 0 ? q.acceptedAnswers as string[] : undefined,
  }));

export class RoomDurableObject {
  private state: DurableObjectState;
  private env: Env;
  private sessions: Map<string, WebSocket>; // Map playerId to WebSocket
  private roomState: {
    code: string;
    participants: Map<string, Participant>;
    gameState: 'lobby' | 'active' | 'results';
    currentQuestion: Question | null;
    currentRound: Round | null;
    usedQuestionIds: string[];
    roundTimer: ReturnType<typeof setTimeout> | null;
  };

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.roomState = {
      code: '',
      participants: new Map(),
      gameState: 'lobby',
      currentQuestion: null,
      currentRound: null,
      usedQuestionIds: [],
      roundTimer: null,
    };
  }

  async fetch(request: Request): Promise<Response> {
    // Handle WebSocket upgrade
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      return this.handleWebSocket();
    }

    // Handle HTTP requests
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/create' && request.method === 'POST') {
      return this.handleCreate(request);
    }

    if (path === '/join' && request.method === 'POST') {
      return this.handleJoin(request);
    }

    if (path === '/validate' && request.method === 'GET') {
      return this.handleValidate();
    }

    return new Response('Not Found', { status: 404 });
  }

  private handleWebSocket(): Response {
    // Creates two ends of a WebSocket connection
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept the WebSocket using Hibernation API
    this.state.acceptWebSocket(server as WebSocket);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  // Handle incoming WebSocket messages (Hibernation API)
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const parsedMessage = JSON.parse(data) as ClientMessage;
      await this.handleMessage(ws, parsedMessage);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.sendError(ws, 'INVALID_MESSAGE', 'Failed to parse message');
    }
  }

  // Handle WebSocket close (Hibernation API)
  async webSocketClose(ws: WebSocket) {
    // Find and remove the participant associated with this WebSocket
    let playerId: string | null = null;
    for (const [id, session] of this.sessions.entries()) {
      if (session === ws) {
        playerId = id;
        break;
      }
    }

    if (playerId) {
      this.handlePlayerLeave(playerId);
    }
  }

  private async handleCreate(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { roomCode: string; creatorName?: string };
      this.roomState.code = body.roomCode;

      return new Response(JSON.stringify({ roomCode: body.roomCode }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error creating room:', error);
      return new Response(JSON.stringify({ error: 'Failed to create room' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleJoin(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { name: string };
      const name = body.name.trim();

      // Check if room is initialized
      if (!this.roomState.code) {
        return new Response(JSON.stringify({ error: 'Room not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check if room is full
      if (this.roomState.participants.size >= MAX_PARTICIPANTS) {
        return new Response(JSON.stringify({ error: 'Room is full' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check if name is already taken
      for (const participant of this.roomState.participants.values()) {
        if (participant.name.toLowerCase() === name.toLowerCase()) {
          return new Response(JSON.stringify({ error: 'Name already taken' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Check if game is in progress
      if (this.roomState.gameState === 'active') {
        return new Response(JSON.stringify({ error: 'Game in progress' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error joining room:', error);
      return new Response(JSON.stringify({ error: 'Failed to join room' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleValidate(): Promise<Response> {
    const exists = this.roomState.code !== '';
    
    if (!exists) {
      return new Response(JSON.stringify({ exists: false }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      exists: true,
      participantCount: this.roomState.participants.size,
      gameState: this.roomState.gameState,
      canJoin: this.roomState.participants.size < MAX_PARTICIPANTS && this.roomState.gameState === 'lobby'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleMessage(ws: WebSocket, message: ClientMessage) {
    switch (message.type) {
      case 'JOIN':
        await this.handleJoinMessage(ws, message.payload);
        break;
      case 'READY':
        await this.handleReadyMessage(ws, message.payload);
        break;
      case 'ANSWER':
        await this.handleAnswerMessage(ws, message.payload);
        break;
      case 'LEAVE':
        await this.handleLeaveMessage(ws);
        break;
      default:
        this.sendError(ws, 'UNKNOWN_MESSAGE', 'Unknown message type');
    }
  }

  private async handleJoinMessage(
    ws: WebSocket,
    payload: { playerId: string; playerName: string }
  ) {
    const { playerId, playerName } = payload;

    // Check if player already exists
    if (this.roomState.participants.has(playerId)) {
      // Reconnection - update WebSocket
      this.sessions.set(playerId, ws);
      const participant = this.roomState.participants.get(playerId)!;
      participant.connectionStatus = 'connected';
      this.broadcastRoomState();
      return;
    }

    // Check room capacity
    if (this.roomState.participants.size >= MAX_PARTICIPANTS) {
      this.sendError(ws, 'ROOM_FULL', 'Room is full');
      return;
    }

    // Check duplicate names
    for (const participant of this.roomState.participants.values()) {
      if (participant.name.toLowerCase() === playerName.toLowerCase()) {
        this.sendError(ws, 'NAME_TAKEN', 'Name already taken');
        return;
      }
    }

    // Add participant
    const participant: Participant = {
      id: playerId,
      name: playerName,
      isReady: false,
      connectionStatus: 'connected',
    };

    this.roomState.participants.set(playerId, participant);
    this.sessions.set(playerId, ws);

    // Broadcast player joined to all participants
    this.broadcast({
      type: 'PLAYER_JOINED',
      payload: { participant },
    });

    // Send full room state to the new participant
    this.sendRoomState(ws);
  }

  private async handleReadyMessage(ws: WebSocket, payload: { isReady: boolean }) {
    // Find player ID for this WebSocket
    let playerId: string | null = null;
    for (const [id, session] of this.sessions.entries()) {
      if (session === ws) {
        playerId = id;
        break;
      }
    }

    if (!playerId) {
      this.sendError(ws, 'NOT_JOINED', 'You must join the room first');
      return;
    }

    const participant = this.roomState.participants.get(playerId);
    if (!participant) {
      this.sendError(ws, 'PARTICIPANT_NOT_FOUND', 'Participant not found');
      return;
    }

    // Only allow ready state changes in lobby
    if (this.roomState.gameState !== 'lobby') {
      this.sendError(ws, 'INVALID_STATE', 'Can only change ready state in lobby');
      return;
    }

    // Toggle ready status
    participant.isReady = payload.isReady;

    // Broadcast ready state change to all participants
    this.broadcast({
      type: 'PLAYER_READY',
      payload: {
        playerId: participant.id,
        isReady: participant.isReady,
      },
    });

    // Check if all players are ready and there are at least 2 players
    const allReady = Array.from(this.roomState.participants.values()).every(p => p.isReady);
    const hasEnoughPlayers = this.roomState.participants.size >= 2;

    if (allReady && hasEnoughPlayers) {
      // Start game after a short delay
      setTimeout(() => {
        this.startGame();
      }, GAME_START_DELAY);
    }
  }

  private startGame() {
    // Select a random unused question
    const question = this.selectQuestion();
    if (!question) {
      console.error('No questions available');
      return;
    }

    // Create round
    const startTime = Date.now();
    this.roomState.currentQuestion = question;
    this.roomState.currentRound = {
      questionId: question.id,
      startTime,
      duration: ROUND_DURATION,
      participantAnswers: [],
      winnerId: null,
      endTime: null,
    };
    this.roomState.gameState = 'active';

    // Reset all participants to not ready and mark as connected
    for (const participant of this.roomState.participants.values()) {
      participant.isReady = false;
    }

    // Set up timer to auto-end round after 3 minutes
    this.roomState.roundTimer = setTimeout(() => {
      this.endRound();
    }, ROUND_DURATION);

    // Broadcast game start to all participants (question without answers)
    this.broadcast({
      type: 'GAME_START',
      payload: {
        question: {
          id: question.id,
          text: question.text,
        },
        startTime,
        duration: ROUND_DURATION,
      },
    });
  }

  private selectQuestion(): Question | null {
    if (QUESTIONS.length === 0) {
      console.error('No questions available in questions.json');
      return null;
    }
    // Get questions that haven't been used yet
    const unusedQuestions = QUESTIONS.filter(
      q => !this.roomState.usedQuestionIds.includes(q.id)
    );

    if (unusedQuestions.length === 0) {
      // If all questions have been used, reset and start over
      this.roomState.usedQuestionIds = [];
      return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    }

    // Select a random unused question
    const selectedQuestion = unusedQuestions[Math.floor(Math.random() * unusedQuestions.length)];
    this.roomState.usedQuestionIds.push(selectedQuestion.id);
    
    return selectedQuestion;
  }

  private async handleAnswerMessage(ws: WebSocket, payload: { answerText: string; timestamp: number }) {
    // Find player ID for this WebSocket
    let playerId: string | null = null;
    for (const [id, session] of this.sessions.entries()) {
      if (session === ws) {
        playerId = id;
        break;
      }
    }

    if (!playerId) {
      this.sendError(ws, 'NOT_JOINED', 'You must join the room first');
      return;
    }

    // Validate game state
    if (this.roomState.gameState !== 'active') {
      this.sendError(ws, 'INVALID_STATE', 'Cannot answer when game is not active');
      return;
    }

    if (!this.roomState.currentRound || !this.roomState.currentQuestion) {
      this.sendError(ws, 'NO_ACTIVE_ROUND', 'No active round');
      return;
    }

    // Check if player already answered
    const existingAnswer = this.roomState.currentRound.participantAnswers.find(
      pa => pa.participantId === playerId
    );
    if (existingAnswer) {
      this.sendError(ws, 'ALREADY_ANSWERED', 'You have already answered this question');
      return;
    }

    // Validate timestamp (must be within round duration)
    if (payload.timestamp < 0 || payload.timestamp > ROUND_DURATION) {
      this.sendError(ws, 'INVALID_TIMESTAMP', 'Invalid timestamp');
      return;
    }

    // Normalize and check answer correctness
    const isCorrect = this.checkAnswer(payload.answerText, this.roomState.currentQuestion);

    // Store answer
    const participantAnswer: ParticipantAnswer = {
      participantId: playerId,
      answerText: payload.answerText,
      timestamp: payload.timestamp,
      isCorrect,
    };
    this.roomState.currentRound.participantAnswers.push(participantAnswer);

    // Send confirmation to submitter (T065)
    const confirmMessage: ServerMessage = {
      type: 'ANSWER_SUBMITTED',
      payload: {
        answerText: payload.answerText,
        timestamp: payload.timestamp,
      },
    };
    try {
      ws.send(JSON.stringify(confirmMessage));
    } catch (error) {
      console.error('Failed to send answer confirmation:', error);
    }

    // Broadcast answer count update to all (T066)
    this.broadcast({
      type: 'ANSWER_COUNT_UPDATE',
      payload: {
        answeredCount: this.roomState.currentRound.participantAnswers.length,
        totalCount: this.roomState.participants.size,
      },
    });

    // Check if all participants have answered (T068)
    if (this.roomState.currentRound.participantAnswers.length === this.roomState.participants.size) {
      // Clear the timer and end the round immediately
      if (this.roomState.roundTimer) {
        clearTimeout(this.roomState.roundTimer);
        this.roomState.roundTimer = null;
      }
      this.endRound();
    }
  }

  private normalizeAnswer(answer: string): string {
    return answer.trim().toLowerCase();
  }

  private checkAnswer(userAnswer: string, question: Question): boolean {
    const normalized = this.normalizeAnswer(userAnswer);
    const correctNormalized = this.normalizeAnswer(question.correctAnswer);

    if (normalized === correctNormalized) {
      return true;
    }

    // Check accepted alternatives
    if (question.acceptedAnswers) {
      return question.acceptedAnswers.some(
        accepted => this.normalizeAnswer(accepted) === normalized
      );
    }

    return false;
  }

  private endRound() {
    if (!this.roomState.currentRound || !this.roomState.currentQuestion) {
      return;
    }

    // Mark round as ended
    this.roomState.currentRound.endTime = Date.now();

    // Add empty answers for participants who didn't answer
    for (const participant of this.roomState.participants.values()) {
      const hasAnswered = this.roomState.currentRound.participantAnswers.some(
        pa => pa.participantId === participant.id
      );
      if (!hasAnswered) {
        this.roomState.currentRound.participantAnswers.push({
          participantId: participant.id,
          answerText: null,
          timestamp: null,
          isCorrect: false,
        });
      }
    }

    // Calculate winner (fastest correct answer)
    const correctAnswers = this.roomState.currentRound.participantAnswers
      .filter(pa => pa.isCorrect && pa.timestamp !== null)
      .sort((a, b) => (a.timestamp ?? Infinity) - (b.timestamp ?? Infinity));

    const winnerId = correctAnswers.length > 0 ? correctAnswers[0].participantId : null;
    this.roomState.currentRound.winnerId = winnerId;

    // Prepare results with participant names
    const results = this.roomState.currentRound.participantAnswers.map(pa => {
      const participant = this.roomState.participants.get(pa.participantId);
      return {
        participantId: pa.participantId,
        participantName: participant?.name ?? 'Unknown',
        answerText: pa.answerText,
        timestamp: pa.timestamp,
        isCorrect: pa.isCorrect,
      };
    });

    // Transition to results state
    this.roomState.gameState = 'results';

    // Broadcast round end with results
    this.broadcast({
      type: 'ROUND_END',
      payload: {
        correctAnswer: this.roomState.currentQuestion.correctAnswer,
        acceptedAnswers: this.roomState.currentQuestion.acceptedAnswers ?? [this.roomState.currentQuestion.correctAnswer],
        winnerId,
        results,
      },
    });

    // Clear round timer
    this.roomState.roundTimer = null;
  }

  private async handleLeaveMessage(ws: WebSocket) {
    // Find player ID for this WebSocket
    let playerId: string | null = null;
    for (const [id, session] of this.sessions.entries()) {
      if (session === ws) {
        playerId = id;
        break;
      }
    }

    if (playerId) {
      this.handlePlayerLeave(playerId);
    }
  }

  private handlePlayerLeave(playerId: string) {
    const participant = this.roomState.participants.get(playerId);
    if (!participant) return;

    // Remove participant
    this.roomState.participants.delete(playerId);
    this.sessions.delete(playerId);

    // Broadcast player left
    this.broadcast({
      type: 'PLAYER_LEFT',
      payload: {
        playerId: participant.id,
        playerName: participant.name,
      },
    });

    // If no participants left, clean up room state
    if (this.roomState.participants.size === 0) {
      // Clear any active timers
      if (this.roomState.roundTimer) {
        clearTimeout(this.roomState.roundTimer);
      }
      
      this.roomState = {
        code: '',
        participants: new Map(),
        gameState: 'lobby',
        currentQuestion: null,
        currentRound: null,
        usedQuestionIds: [],
        roundTimer: null,
      };
    }
  }

  private sendRoomState(ws: WebSocket) {
    const message: ServerMessage = {
      type: 'ROOM_STATE',
      payload: {
        roomCode: this.roomState.code,
        gameState: this.roomState.gameState,
        participants: Array.from(this.roomState.participants.values()),
        currentQuestion: this.roomState.currentQuestion,
        currentRound: this.roomState.currentRound ? {
          startTime: this.roomState.currentRound.startTime,
          duration: this.roomState.currentRound.duration,
          answeredCount: 0, // Will be implemented in Phase 5
        } : null,
      },
    };

    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send room state:', error);
    }
  }

  private broadcastRoomState() {
    const message: ServerMessage = {
      type: 'ROOM_STATE',
      payload: {
        roomCode: this.roomState.code,
        gameState: this.roomState.gameState,
        participants: Array.from(this.roomState.participants.values()),
        currentQuestion: this.roomState.currentQuestion,
        currentRound: this.roomState.currentRound ? {
          startTime: this.roomState.currentRound.startTime,
          duration: this.roomState.currentRound.duration,
          answeredCount: 0, // Will be implemented in Phase 5
        } : null,
      },
    };

    this.broadcast(message);
  }

  private broadcast(message: ServerMessage) {
    const data = JSON.stringify(message);
    this.sessions.forEach(session => {
      try {
        session.send(data);
      } catch (error) {
        console.error('Failed to send message to session:', error);
      }
    });
  }

  private sendError(ws: WebSocket, code: string, errorMessage: string) {
    const message: ServerMessage = {
      type: 'ERROR',
      payload: {
        code,
        message: errorMessage,
      },
    };

    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send error message:', error);
    }
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

const workerHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const roomCode = url.searchParams.get('room');

    if (!roomCode) {
      return new Response('Room code required', { status: 400 });
    }

    // Get or create Durable Object instance
    const id = env.ROOMS.idFromName(roomCode);
    const stub = env.ROOMS.get(id);

    return stub.fetch(request);
  },
};

export default workerHandler;
