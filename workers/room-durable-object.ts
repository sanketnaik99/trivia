/**
 * Cloudflare Durable Object for managing trivia room state
 * Handles WebSocket connections and room game logic
 */

import { ClientMessage, ServerMessage, Participant } from './types';

interface Question {
  id: string;
  text: string;
  correctAnswer: string;
  acceptedAnswers?: string[];
}

interface Round {
  questionId: string;
  startTime: number;
  duration: number;
  answers: unknown[];
  winnerId: string | null;
}

interface Env {
  ROOMS: DurableObjectNamespace;
}

const MAX_PARTICIPANTS = 8;
const GAME_START_DELAY = 15000; // 15 seconds countdown before game starts
const ROUND_DURATION = 180000; // 3 minutes in milliseconds

// Hardcoded questions (same as in app/lib/questions.ts)
const QUESTIONS: Question[] = [
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
        await this.handleAnswerMessage();
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
      answers: [],
      winnerId: null,
    };
    this.roomState.gameState = 'active';

    // Reset all participants to not ready and mark as connected
    for (const participant of this.roomState.participants.values()) {
      participant.isReady = false;
    }

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

  private async handleAnswerMessage() {
    // Answer logic will be implemented in Phase 5 (User Story 3)
    console.log('Answer message received - will be implemented in Phase 5');
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
      this.roomState = {
        code: '',
        participants: new Map(),
        gameState: 'lobby',
        currentQuestion: null,
        currentRound: null,
        usedQuestionIds: [],
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
