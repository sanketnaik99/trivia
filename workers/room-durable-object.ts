/**
 * Cloudflare Durable Object for managing trivia room state
 * Handles WebSocket connections and room game logic
 */

interface Participant {
  id: string;
  name: string;
  isReady: boolean;
  connectionStatus: string;
}

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

export class RoomDurableObject {
  private state: DurableObjectState;
  private env: Env;
  private sessions: Set<WebSocket>;
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
    this.sessions = new Set();
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
      return this.handleWebSocket(request);
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
      return this.handleValidate(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  private handleWebSocket(_request: Request): Response {
    // Creates two ends of a WebSocket connection
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Accept the WebSocket using Hibernation API
    this.state.acceptWebSocket(server as WebSocket);
    this.sessions.add(server as WebSocket);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  // Handle incoming WebSocket messages (Hibernation API)
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const data = typeof message === 'string' ? message : new TextDecoder().decode(message);
      const parsedMessage = JSON.parse(data);
      this.handleMessage(ws, parsedMessage);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  // Handle WebSocket close (Hibernation API)
  async webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean) {
    this.sessions.delete(ws);
    // Handle player disconnect
  }

  private async handleCreate(_request: Request): Promise<Response> {
    const roomCode = this.generateRoomCode();
    this.roomState.code = roomCode;

    return new Response(JSON.stringify({ roomCode }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleJoin(_request: Request): Promise<Response> {
    // Join logic will be implemented in Phase 3
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleValidate(_request: Request): Promise<Response> {
    const exists = this.roomState.code !== '';
    return new Response(JSON.stringify({ exists }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private handleMessage(_ws: WebSocket, message: { type: string; payload: Record<string, unknown> }) {
    // Message handling will be implemented in Phase 3
    console.log('Received message:', message.type);
  }

  private broadcast(message: Record<string, unknown>) {
    const data = JSON.stringify(message);
    this.sessions.forEach(session => {
      try {
        session.send(data);
      } catch (error) {
        console.error('Failed to send message to session:', error);
      }
    });
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
