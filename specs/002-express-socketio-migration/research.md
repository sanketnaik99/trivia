# Research: Express + Socket.IO Migration

**Feature**: 002-express-socketio-migration  
**Date**: 2025-11-01  
**Purpose**: Technical decisions and patterns for migrating from Cloudflare Durable Objects to Express + Socket.IO

## Overview

This document consolidates research on migrating the trivia backend from Cloudflare Durable Objects to Express with Socket.IO while maintaining existing functionality and adding score tracking.

---

## Decision 1: Backend Framework - Express.js

### Decision
Use **Express 4.x** for the HTTP server with Socket.IO 4.x for WebSocket communication.

### Rationale
- **Proven stability**: Express is the most mature Node.js web framework with extensive community support
- **Minimal learning curve**: Straightforward API aligns with clean code principles
- **Socket.IO compatibility**: Works seamlessly with Socket.IO's hybrid HTTP/WebSocket approach
- **Lightweight**: Minimal overhead, fast startup, suitable for in-memory state management
- **TypeScript support**: Excellent type definitions available via @types/express

### Alternatives Considered
- **Fastify**: More performant but unnecessary complexity for this use case. Express performance is sufficient for 100 rooms.
- **Koa**: Cleaner async/await support but smaller ecosystem. Express community resources more valuable.
- **Next.js API routes**: Cannot maintain persistent WebSocket connections needed for Socket.IO.

---

## Decision 2: Real-time Communication - Socket.IO

### Decision
Use **Socket.IO 4.x** for bidirectional real-time communication.

### Rationale
- **Backward compatibility**: Maintains existing WebSocket message protocol from Durable Objects implementation
- **Built-in features**: Automatic reconnection, room management, broadcast utilities reduce custom code
- **Fallback support**: Gracefully falls back to long-polling if WebSockets unavailable
- **TypeScript support**: Strong typing for events and payloads
- **Battle-tested**: Proven at scale for real-time applications

### Alternatives Considered
- **Native WebSocket (ws)**: More control but requires implementing reconnection, room management, heartbeat manually
- **Server-Sent Events (SSE)**: Unidirectional only, cannot support client → server messages
- **WebRTC**: Overkill for this use case, adds significant complexity

---

## Decision 3: In-Memory Storage Pattern

### Decision
Use a **Map-based storage with scheduled cleanup** for room state.

### Rationale
- **Simplicity**: Direct Map access is fast and straightforward
- **No external dependencies**: Avoids Redis or database complexity
- **Sufficient scale**: 100 rooms × 8 players fits comfortably in memory
- **Clean separation**: `room.store.ts` encapsulates all storage logic
- **Explicit lifecycle**: Cleanup timers provide deterministic resource management

### Implementation Pattern
```typescript
class RoomStore {
  private rooms: Map<string, Room> = new Map();
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();
  
  scheduleCleanup(roomCode: string, delayMs: number): void {
    // Clear existing timer
    const existingTimer = this.cleanupTimers.get(roomCode);
    if (existingTimer) clearTimeout(existingTimer);
    
    // Schedule new cleanup
    const timer = setTimeout(() => {
      this.deleteRoom(roomCode);
    }, delayMs);
    
    this.cleanupTimers.set(roomCode, timer);
  }
}
```

### Alternatives Considered
- **Redis**: External dependency, deployment complexity, unnecessary for MVP
- **SQLite**: Persistence not required per spec, adds I/O overhead
- **Repository pattern with interface**: Over-abstraction for simple Map operations

---

## Decision 4: Room Code Generation

### Decision
Generate **6-character alphanumeric codes** excluding ambiguous characters (0, O, I, 1, L).

### Rationale
- **Maintains compatibility**: Matches existing spec 001 room code format
- **User-friendly**: Easy to read aloud, type on mobile keyboards
- **Sufficient uniqueness**: ~2 billion combinations (32^6) far exceeds 100-room limit
- **Collision handling**: Check existence before returning new code

### Implementation Pattern
```typescript
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars (exclude 0,O,I,1,L)

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}
```

### Alternatives Considered
- **UUID**: Too long for manual entry, not user-friendly
- **Short hash**: Potential collisions require complex handling
- **Sequential numbers**: Predictable, security concerns (room enumeration)

---

## Decision 5: Socket.IO Room Management

### Decision
Use **Socket.IO's built-in rooms feature** to isolate communication between game rooms.

### Rationale
- **Native feature**: No custom implementation needed
- **Efficient broadcasting**: `io.to(roomCode).emit()` sends to specific room only
- **Automatic cleanup**: Rooms removed when last socket leaves
- **Namespace support**: Can separate concerns (e.g., `/game`, `/admin`) if needed later

### Implementation Pattern
```typescript
socket.on('JOIN', (payload) => {
  const { roomCode, playerId } = payload;
  
  // Join Socket.IO room
  socket.join(roomCode);
  
  // Broadcast to room
  io.to(roomCode).emit('PLAYER_JOINED', { participant });
});
```

### Alternatives Considered
- **Manual tracking**: Map of room → Set<SocketId> adds unnecessary code
- **Pub/Sub pattern**: Over-engineering for single-server deployment

---

## Decision 6: Score Tracking Strategy

### Decision
Store **cumulative scores as participant property** with round-by-round history for tie-breaking.

### Rationale
- **Simple data structure**: Single source of truth in Participant entity
- **Efficient sorting**: Direct score comparison for leaderboard
- **Tie-breaking support**: Track `lastWinTimestamp` for recency-based ranking
- **Atomic updates**: Single participant object mutation prevents race conditions

### Data Structure
```typescript
interface Participant {
  id: string;
  name: string;
  score: number;              // Cumulative score
  roundsWon: number;          // Total rounds won
  lastWinTimestamp: number | null; // For tie-breaking
  // ... other fields
}
```

### Alternatives Considered
- **Separate Score table**: Over-normalization for in-memory storage
- **Round-by-round calculation**: Recomputing scores on each display is inefficient

---

## Decision 7: Frontend Socket.IO Client Integration

### Decision
Replace custom WebSocket client with **Socket.IO client library** (`socket.io-client`).

### Rationale
- **Automatic reconnection**: Built-in exponential backoff matches existing behavior
- **Event-based API**: Cleaner than raw WebSocket message parsing
- **TypeScript support**: Strongly typed event handlers
- **Minimal changes**: Existing message types remain unchanged

### Migration Pattern
```typescript
// Before (custom WebSocket)
const ws = new WebSocket(url);
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handlers[message.type]?.(message.payload);
};

// After (Socket.IO client)
import { io } from 'socket.io-client';
const socket = io(url);
socket.on('ROOM_STATE', (payload) => {
  // Handle message
});
```

### Alternatives Considered
- **Keep WebSocket API**: Requires custom reconnection logic, not worth maintaining

---

## Decision 8: CORS Configuration

### Decision
Use **cors middleware with dynamic origin validation** based on environment.

### Rationale
- **Development flexibility**: Allow localhost:3000 (Next.js dev server)
- **Production security**: Whitelist only production domain(s)
- **Credential support**: Enable cookies/auth headers if needed later

### Implementation Pattern
```typescript
import cors from 'cors';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

### Alternatives Considered
- **Allow all origins**: Security risk, rejected
- **Proxy through Next.js**: Adds latency, complicates deployment

---

## Decision 9: Error Handling Strategy

### Decision
Use **consistent error response format** with error codes and user-friendly messages.

### Rationale
- **Client-friendly**: Clear error codes enable specific UI handling
- **Debugging**: Server logs full error, client receives sanitized message
- **Consistency**: Both HTTP and Socket.IO errors follow same pattern

### Error Format
```typescript
// HTTP errors
res.status(400).json({
  error: {
    code: 'ROOM_FULL',
    message: 'Room has reached maximum capacity',
  }
});

// Socket.IO errors
socket.emit('ERROR', {
  code: 'INVALID_STATE',
  message: 'Cannot answer when game is not active',
});
```

### Alternatives Considered
- **Throw exceptions**: Crashes server on unhandled errors, rejected
- **String-only errors**: Hard to handle programmatically on frontend

---

## Decision 10: Environment Configuration

### Decision
Use **dotenv for local development**, environment variables in production.

### Rationale
- **Standard practice**: Widely adopted pattern in Node.js ecosystem
- **Deployment flexibility**: Works with Docker, serverless, VMs
- **Type-safe access**: Create typed config object in `config/env.ts`

### Configuration Structure
```typescript
// config/env.ts
export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  roomCleanupMs: 5 * 60 * 1000, // 5 minutes
  maxRooms: 100,
  reconnectionWindow: 30 * 1000, // 30 seconds
};
```

### Alternatives Considered
- **JSON config file**: Cannot use environment-specific values
- **Multiple .env files**: Over-complexity for simple config needs

---

## Decision 11: Logging Strategy

### Decision
Use **simple console logging** with structured format for production parsing.

### Rationale
- **Zero dependencies**: No external logging library needed
- **Sufficient for MVP**: Can upgrade to Winston/Pino if needed later
- **Structured output**: JSON format in production for log aggregation

### Implementation Pattern
```typescript
// utils/logger.util.ts
export const logger = {
  info: (message: string, meta?: object) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
  },
  error: (message: string, error?: Error, meta?: object) => {
    console.error(JSON.stringify({ level: 'error', message, error: error?.message, stack: error?.stack, ...meta, timestamp: new Date().toISOString() }));
  },
};
```

### Alternatives Considered
- **Winston/Pino**: Added dependencies not justified for MVP
- **No logging**: Insufficient for debugging production issues

---

## Decision 12: TypeScript Configuration

### Decision
Use **strict TypeScript** with path aliases for clean imports.

### Rationale
- **Type safety**: Catch errors at compile time
- **Clean imports**: `@/services/room.service` instead of `../../services/room.service`
- **Constitution compliance**: Enforces typed code, no implicit `any`

### Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Alternatives Considered
- **Loose TypeScript**: Defeats purpose of using TypeScript
- **No path aliases**: Results in messy relative imports

---

## Summary of Key Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Express | 4.x | HTTP server framework |
| Socket.IO | 4.x | WebSocket communication |
| TypeScript | 5.x | Type safety and developer experience |
| cors | latest | Cross-origin request handling |
| uuid | latest | Participant ID generation |
| socket.io-client | 4.x | Frontend Socket.IO client |

**Total New Dependencies**: 5 (express, socket.io, cors, uuid, socket.io-client)

All decisions align with constitution principles: clean code, minimal dependencies, no testing infrastructure.
