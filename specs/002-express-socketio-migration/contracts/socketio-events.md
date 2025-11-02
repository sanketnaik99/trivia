# Socket.IO Events Contract

**Feature**: 002-express-socketio-migration  
**Date**: 2025-11-01  
**Connection URL**: `http://localhost:3001` (development) / `wss://api.trivia.app` (production)

## Overview

Real-time bidirectional communication for trivia gameplay. Maintains backward compatibility with Cloudflare Durable Objects WebSocket protocol from Spec 001, with score tracking additions.

---

## Connection

### Client Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'], // WebSocket first, polling fallback
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  // Send JOIN message immediately after connection
  socket.emit('JOIN', {
    playerId: localStorage.getItem('playerId') || generateId(),
    playerName: 'Alice',
    roomCode: 'A3B7K9',
  });
});
```

### Connection Lifecycle

```
1. Client connects to Socket.IO server
   ↓
2. Server assigns socket ID
   ↓
3. Client emits JOIN event with credentials
   ↓
4. Server validates and joins client to Socket.IO room
   ↓
5. Server broadcasts PLAYER_JOINED to existing participants
   ↓
6. Server sends ROOM_STATE to new participant
```

### Reconnection Strategy

- **Automatic**: Socket.IO client attempts reconnection with exponential backoff
- **Window**: 30 seconds to reconnect with same `playerId`
- **Restoration**: If rejoining within window, participant state restored
- **Timeout**: After 30 seconds, participant marked as left

---

## Client → Server Events

### JOIN

Join a room and establish participant identity.

**Event Name**: `'JOIN'`

**Payload**:
```typescript
{
  playerId: string;    // UUID (persisted in localStorage)
  playerName: string;  // Display name (1-20 chars, trimmed)
  roomCode: string;    // 6-character room code
}
```

**Server Actions**:
1. Validate room exists
2. Check room not full (< 8 participants)
3. Check name not taken
4. Check game state is 'lobby'
5. Create or restore participant
6. Join Socket.IO room
7. Cancel cleanup timer for room
8. Broadcast PLAYER_JOINED
9. Send ROOM_STATE to joiner

**Error Responses**:
- `ROOM_NOT_FOUND`: Room code invalid
- `ROOM_FULL`: 8 participants already
- `NAME_TAKEN`: Name already in use
- `GAME_IN_PROGRESS`: Cannot join during active game

---

### READY

Toggle ready status for game start.

**Event Name**: `'READY'`

**Payload**:
```typescript
{
  isReady: boolean;  // New ready state
}
```

**Server Actions**:
1. Validate player is in room
2. Validate game state is 'lobby' or 'results'
3. Update participant `isReady`
4. Broadcast PLAYER_READY to all
5. If all ready && ≥2 players → start game countdown

**Error Responses**:
- `NOT_JOINED`: Player not in room
- `INVALID_STATE`: Game not in lobby or results

---

### ANSWER

Submit answer for current question.

**Event Name**: `'ANSWER'`

**Payload**:
```typescript
{
  answerText: string;  // Player's answer
  timestamp: number;   // Milliseconds since round start (0-180000)
}
```

**Server Actions**:
1. Validate player is in room
2. Validate game state is 'active'
3. Validate player hasn't already answered
4. Validate timestamp within 0-180000ms
5. Check answer correctness (normalized comparison)
6. Store answer in current round
7. Send ANSWER_SUBMITTED to submitter
8. Broadcast ANSWER_COUNT_UPDATE to all
9. If all answered → end round immediately

**Error Responses**:
- `NOT_JOINED`: Player not in room
- `INVALID_STATE`: Game not active
- `ALREADY_ANSWERED`: Already submitted answer this round
- `INVALID_TIMESTAMP`: Timestamp out of range

---

### LEAVE

Leave the room.

**Event Name**: `'LEAVE'`

**Payload**:
```typescript
{}  // Empty payload
```

**Server Actions**:
1. Remove participant from room
2. Broadcast PLAYER_LEFT to remaining participants
3. If no participants left → schedule room cleanup (5 min)
4. Disconnect socket

**No Error Response**: Always succeeds

---

## Server → Client Events

### ROOM_STATE

Full room state synchronization (sent on join and major state changes).

**Event Name**: `'ROOM_STATE'`

**Payload**:
```typescript
{
  roomCode: string;
  gameState: 'lobby' | 'active' | 'results';
  participants: Array<{
    id: string;
    name: string;
    isReady: boolean;
    connectionStatus: 'connected' | 'disconnected';
    score: number;              // NEW: Cumulative score
    roundsWon: number;          // NEW: Total rounds won
  }>;
  currentQuestion: {
    id: string;
    text: string;
  } | null;
  currentRound: {
    startTime: number;
    duration: number;
    answeredCount: number;
  } | null;
  leaderboard: Array<{         // NEW: Sorted by score
    participantId: string;
    participantName: string;
    score: number;
    roundsWon: number;
    ranking: number;
  }>;
}
```

**When Sent**:
- To new participant on JOIN
- To all participants on major state transitions
- To reconnecting participant

**Changes from Spec 001**:
- Added `score` and `roundsWon` to participants
- Added `leaderboard` array with rankings

---

### PLAYER_JOINED

New player joined the room.

**Event Name**: `'PLAYER_JOINED'`

**Payload**:
```typescript
{
  participant: {
    id: string;
    name: string;
    isReady: boolean;
    connectionStatus: 'connected';
    score: 0;         // NEW: Starts at 0
    roundsWon: 0;     // NEW: Starts at 0
  }
}
```

**Recipients**: All participants except the joiner

---

### PLAYER_READY

Player toggled ready status.

**Event Name**: `'PLAYER_READY'`

**Payload**:
```typescript
{
  playerId: string;
  isReady: boolean;
}
```

**Recipients**: All participants in room

---

### GAME_START

Game starting, here's the question.

**Event Name**: `'GAME_START'`

**Payload**:
```typescript
{
  question: {
    id: string;
    text: string;
    // Note: correctAnswer NOT sent (prevents cheating)
  };
  startTime: number;   // Unix timestamp (ms)
  duration: 180000;    // Always 3 minutes
}
```

**Recipients**: All participants in room

**Timing**: Sent 15 seconds after all players ready

---

### ANSWER_SUBMITTED

Confirmation that answer was recorded.

**Event Name**: `'ANSWER_SUBMITTED'`

**Payload**:
```typescript
{
  answerText: string;
  timestamp: number;
}
```

**Recipients**: Only the participant who submitted

---

### ANSWER_COUNT_UPDATE

Progress update on how many answered.

**Event Name**: `'ANSWER_COUNT_UPDATE'`

**Payload**:
```typescript
{
  answeredCount: number;  // How many submitted
  totalCount: number;     // Total participants
}
```

**Recipients**: All participants in room

**When Sent**: After each answer submission

---

### ROUND_END

Round ended, here are the results.

**Event Name**: `'ROUND_END'`

**Payload**:
```typescript
{
  correctAnswer: string;
  acceptedAnswers: string[];
  winnerId: string | null;
  winnerName: string | null;     // NEW: For display
  winnerScore: number | null;    // NEW: Updated score
  results: Array<{
    participantId: string;
    participantName: string;
    answerText: string | null;
    timestamp: number | null;
    isCorrect: boolean;
    scoreChange: number;         // NEW: +1 for winner, 0 for others
    newScore: number;            // NEW: Updated cumulative score
  }>;
  leaderboard: Array<{           // NEW: Updated leaderboard
    participantId: string;
    participantName: string;
    score: number;
    roundsWon: number;
    ranking: number;
  }>;
}
```

**Recipients**: All participants in room

**When Sent**: When all answered OR 3-minute timer expires

**Changes from Spec 001**:
- Added `winnerName`, `winnerScore`
- Added `scoreChange` and `newScore` to results
- Added `leaderboard` with rankings

---

### PLAYER_LEFT

Player left the room.

**Event Name**: `'PLAYER_LEFT'`

**Payload**:
```typescript
{
  playerId: string;
  playerName: string;
}
```

**Recipients**: Remaining participants in room

---

### ERROR

Error message for invalid action.

**Event Name**: `'ERROR'`

**Payload**:
```typescript
{
  code: string;      // Machine-readable error code
  message: string;   // Human-readable error message
}
```

**Recipients**: Only the participant that caused the error

**Error Codes** (same as Spec 001):
- `ROOM_NOT_FOUND`
- `ROOM_FULL`
- `NAME_TAKEN`
- `GAME_IN_PROGRESS`
- `NOT_JOINED`
- `INVALID_STATE`
- `ALREADY_ANSWERED`
- `INVALID_TIMESTAMP`

---

### SESSION_LOST

**NEW**: Server restarted, room state lost.

**Event Name**: `'SESSION_LOST'`

**Payload**:
```typescript
{
  message: 'Server restarted. Room state lost. Redirecting to homepage...'
}
```

**Recipients**: All connected clients on server startup recovery

**Client Action**: Display error message and redirect to homepage

---

## Message Flow Examples

### Complete Game Flow with Scores

```
# Room Creation & Join
Client A → Server: [HTTP POST /api/room/create]
Server → Client A: { roomCode: "ABC123" }

Client A → Server: [Socket] emit('JOIN', { playerId: "p1", playerName: "Alice", roomCode: "ABC123" })
Server → Client A: [Socket] on('ROOM_STATE', { participants: [{ name: "Alice", score: 0 }], ... })

Client B → Server: [Socket] emit('JOIN', { playerId: "p2", playerName: "Bob", roomCode: "ABC123" })
Server → Client A: [Socket] on('PLAYER_JOINED', { participant: { name: "Bob", score: 0 } })
Server → Client B: [Socket] on('ROOM_STATE', { participants: [{Alice, 0}, {Bob, 0}], ... })

# Ready Up
Client A → Server: emit('READY', { isReady: true })
Server → All: on('PLAYER_READY', { playerId: "p1", isReady: true })

Client B → Server: emit('READY', { isReady: true })
Server → All: on('PLAYER_READY', { playerId: "p2", isReady: true })

# 15-second countdown, then...
Server → All: on('GAME_START', { question: {...}, startTime: 1234567890, duration: 180000 })

# Answer Submission
Client A → Server: emit('ANSWER', { answerText: "Paris", timestamp: 5420 })
Server → Client A: on('ANSWER_SUBMITTED', { answerText: "Paris", timestamp: 5420 })
Server → All: on('ANSWER_COUNT_UPDATE', { answeredCount: 1, totalCount: 2 })

Client B → Server: emit('ANSWER', { answerText: "London", timestamp: 7830 })
Server → Client B: on('ANSWER_SUBMITTED', { answerText: "London", timestamp: 7830 })
Server → All: on('ANSWER_COUNT_UPDATE', { answeredCount: 2, totalCount: 2 })

# Round End (Alice wins with correct answer)
Server → All: on('ROUND_END', {
  correctAnswer: "Paris",
  winnerId: "p1",
  winnerName: "Alice",
  winnerScore: 1,
  results: [
    { participantName: "Alice", isCorrect: true, scoreChange: +1, newScore: 1 },
    { participantName: "Bob", isCorrect: false, scoreChange: 0, newScore: 0 }
  ],
  leaderboard: [
    { participantName: "Alice", score: 1, ranking: 1 },
    { participantName: "Bob", score: 0, ranking: 2 }
  ]
})

# Next Round
Client A → Server: emit('READY', { isReady: true })
Client B → Server: emit('READY', { isReady: true })
[Game repeats, scores accumulate...]
```

---

## TypeScript Client Integration

### Event Type Definitions

```typescript
// Client events (emit)
interface ClientEvents {
  JOIN: (payload: { playerId: string; playerName: string; roomCode: string }) => void;
  READY: (payload: { isReady: boolean }) => void;
  ANSWER: (payload: { answerText: string; timestamp: number }) => void;
  LEAVE: (payload: {}) => void;
}

// Server events (listen)
interface ServerEvents {
  ROOM_STATE: (payload: RoomStatePayload) => void;
  PLAYER_JOINED: (payload: { participant: Participant }) => void;
  PLAYER_READY: (payload: { playerId: string; isReady: boolean }) => void;
  GAME_START: (payload: GameStartPayload) => void;
  ANSWER_SUBMITTED: (payload: { answerText: string; timestamp: number }) => void;
  ANSWER_COUNT_UPDATE: (payload: { answeredCount: number; totalCount: number }) => void;
  ROUND_END: (payload: RoundEndPayload) => void;
  PLAYER_LEFT: (payload: { playerId: string; playerName: string }) => void;
  ERROR: (payload: { code: string; message: string }) => void;
  SESSION_LOST: (payload: { message: string }) => void;
}

// Typed Socket.IO client
import { Socket } from 'socket.io-client';
type TypedSocket = Socket<ServerEvents, ClientEvents>;
```

---

## Backend Socket.IO Setup

### Server Configuration

```typescript
import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('JOIN', handleJoin(socket));
  socket.on('READY', handleReady(socket));
  socket.on('ANSWER', handleAnswer(socket));
  socket.on('LEAVE', handleLeave(socket));
  socket.on('disconnect', handleDisconnect(socket));
});
```

---

## Room Management with Socket.IO

### Joining and Broadcasting

```typescript
function handleJoin(socket: Socket) {
  return async (payload: JoinPayload) => {
    const { roomCode, playerId, playerName } = payload;
    
    // Validate and create participant
    const room = roomStore.getRoom(roomCode);
    if (!room) {
      socket.emit('ERROR', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }
    
    // Join Socket.IO room
    socket.join(roomCode);
    
    // Store room code on socket for later reference
    socket.data.roomCode = roomCode;
    socket.data.playerId = playerId;
    
    // Broadcast to others
    socket.to(roomCode).emit('PLAYER_JOINED', { participant });
    
    // Send state to joiner
    socket.emit('ROOM_STATE', getRoomState(room));
  };
}
```

### Broadcasting to Room

```typescript
// Broadcast to all in room
io.to(roomCode).emit('GAME_START', gameStartPayload);

// Broadcast to all except sender
socket.to(roomCode).emit('PLAYER_READY', { playerId, isReady });

// Send to specific socket
socket.emit('ANSWER_SUBMITTED', { answerText, timestamp });
```

---

## Migration from Spec 001

### Preserved Behavior
- ✅ All event names unchanged
- ✅ All payload structures compatible
- ✅ Error codes identical
- ✅ Connection flow same

### New Additions
- ✅ Score fields in ROOM_STATE and ROUND_END
- ✅ Leaderboard in ROOM_STATE and ROUND_END
- ✅ SESSION_LOST event for server restarts
- ✅ TypeScript event definitions

### Breaking Changes
**None** - All existing frontend Socket.IO handlers remain compatible. New fields are additive.

---

## Performance Considerations

### Broadcast Efficiency
- Use `socket.to(roomCode).emit()` for room-scoped messages
- Avoid `io.emit()` for room-specific events
- Batch state updates when possible

### Connection Limits
- Max 800 concurrent connections (100 rooms × 8 players)
- Socket.IO handles connection pooling automatically
- Monitor memory usage with large participant counts

### Message Size
- Keep payloads < 10KB
- Avoid sending full question bank in messages
- Use references (IDs) instead of nested objects where possible

---

## Testing Recommendations

### Manual Testing Tools
- **Socket.IO Client Tool**: https://amritb.github.io/socketio-client-tool/
- **Browser DevTools**: Monitor WebSocket frames in Network tab
- **Postman**: Supports Socket.IO connections for testing

### Test Scenarios
1. Join room with 2+ players
2. Toggle ready status
3. Submit answers (correct and incorrect)
4. Complete full round
5. Test reconnection (disconnect and rejoin within 30s)
6. Test timeout (disconnect for >30s)
7. Test room cleanup (leave all players, wait 5 min)

---

## Security Considerations

### Input Validation
- ✅ Sanitize all user input (playerName, answerText)
- ✅ Validate room codes (alphanumeric, 6 chars)
- ✅ Validate timestamps (0-180000 range)
- ✅ Prevent injection attacks (no HTML in names)

### Rate Limiting
- ✅ Limit ANSWER submissions (1 per round per player)
- ✅ Limit READY toggles (reasonable frequency)
- ⚠️ Consider adding connection rate limiting if abuse detected

### Answer Protection
- ✅ Never send `correctAnswer` or `acceptedAnswers` before round ends
- ✅ Validate answers server-side only
- ✅ Normalize answers (trim, lowercase) server-side

All security measures are implemented server-side. Client validation is for UX only.
