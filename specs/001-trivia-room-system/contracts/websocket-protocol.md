# WebSocket Protocol: Real-time Messages

**Feature**: 001-trivia-room-system  
**Date**: 2025-10-30

## Connection

### WebSocket URL

```
wss://trivia-ws.example.com/room/{roomCode}?playerId={playerId}
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `roomCode` | string | Yes | 6-character room code |
| `playerId` | string | Yes | UUID obtained from HTTP API |

### Connection Flow

1. Client calls `POST /api/room/create` or `POST /api/room/{code}/join`
2. Client receives `playerId` and `websocketUrl`
3. Client connects to WebSocket with `playerId` in query string
4. Server validates `playerId` and adds client to room
5. Server sends initial `ROOM_STATE` message to client
6. Server broadcasts `PLAYER_JOINED` to all other clients

### Disconnection Handling

- **Client closes**: Server marks participant as disconnected, broadcasts update
- **Network failure**: Client attempts reconnect with exponential backoff
- **Server closes**: Client shows "Connection lost" and attempts reconnect

---

## Message Format

All messages are JSON objects with a `type` field.

```typescript
{
  "type": "MESSAGE_TYPE",
  "payload": { /* message-specific data */ }
}
```

---

## Client → Server Messages

Messages sent from client to server.

### JOIN

Join the room (sent immediately after connection).

```json
{
  "type": "JOIN",
  "payload": {
    "playerId": "550e8400-e29b-41d4-a716-446655440000",
    "playerName": "Alice"
  }
}
```

**Payload Schema**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `playerId` | string | Yes | UUID from HTTP API |
| `playerName` | string | Yes | Display name (1-20 chars) |

**Server Response**: `ROOM_STATE` (to sender), `PLAYER_JOINED` (to others)

---

### READY

Toggle ready status (lobby state only).

```json
{
  "type": "READY",
  "payload": {
    "isReady": true
  }
}
```

**Payload Schema**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `isReady` | boolean | Yes | New ready state |

**Server Response**: `PLAYER_READY` (broadcast to all)

**Validation**:
- Only valid in `lobby` game state
- Returns error if game is active

---

### ANSWER

Submit answer for current question.

```json
{
  "type": "ANSWER",
  "payload": {
    "answerText": "Paris",
    "timestamp": 5420
  }
}
```

**Payload Schema**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `answerText` | string | Yes | Text answer entered by user |
| `timestamp` | number | Yes | Milliseconds since round start |

**Server Response**: `ANSWER_SUBMITTED` (to sender), `ANSWER_COUNT_UPDATE` (to all)

**Validation**:
- Only valid when `gameState = 'active'`
- Cannot submit if already answered
- `answerText` is normalized (trimmed, lowercase) for comparison
- `timestamp` must be 0-180000 (3 minutes)

---

### LEAVE

Leave the room.

```json
{
  "type": "LEAVE",
  "payload": {}
}
```

**Payload Schema**: Empty object

**Server Response**: `PLAYER_LEFT` (broadcast to all), closes WebSocket

**Side Effects**:
- Removes player from room
- If all players leave, room is deleted
- If player was ready, game start conditions recalculated

---

## Server → Client Messages

Messages sent from server to clients.

### ROOM_STATE

Full room state (sent on connection or major changes).

```json
{
  "type": "ROOM_STATE",
  "payload": {
    "roomCode": "A3B7K9",
    "gameState": "lobby",
    "participants": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Alice",
        "isReady": true,
        "connectionStatus": "connected"
      },
      {
        "id": "650e8400-e29b-41d4-a716-446655440001",
        "name": "Bob",
        "isReady": false,
        "connectionStatus": "connected"
      }
    ],
    "currentQuestion": null,
    "currentRound": null
  }
}
```

**Payload Schema**:
| Field | Type | Description |
|-------|------|-------------|
| `roomCode` | string | Room identifier |
| `gameState` | string | 'lobby', 'active', or 'results' |
| `participants` | Participant[] | Array of all players |
| `currentQuestion` | Question \| null | Current question if active |
| `currentRound` | Round \| null | Current round data if active/results |

**When Sent**:
- On client connection (initial state)
- After major state transitions (lobby → active → results)

---

### PLAYER_JOINED

New player joined the room.

```json
{
  "type": "PLAYER_JOINED",
  "payload": {
    "participant": {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "name": "Bob",
      "isReady": false,
      "connectionStatus": "connected"
    }
  }
}
```

**Payload Schema**:
| Field | Type | Description |
|-------|------|-------------|
| `participant` | Participant | The new player |

**When Sent**: Broadcast to all existing clients when new player joins

---

### PLAYER_READY

Player changed ready status.

```json
{
  "type": "PLAYER_READY",
  "payload": {
    "playerId": "550e8400-e29b-41d4-a716-446655440000",
    "isReady": true
  }
}
```

**Payload Schema**:
| Field | Type | Description |
|-------|------|-------------|
| `playerId` | string | ID of player who toggled ready |
| `isReady` | boolean | New ready state |

**When Sent**: Broadcast to all when player toggles ready

---

### GAME_START

Game starting, here's the first question.

```json
{
  "type": "GAME_START",
  "payload": {
    "question": {
      "id": "q1",
      "text": "What is the capital of France?"
    },
    "startTime": 1698624100000,
    "duration": 180000
  }
}
```

**Payload Schema**:
| Field | Type | Description |
|-------|------|-------------|
| `question` | Question | The question (text only, no answer options) |
| `startTime` | number | Unix timestamp (ms) when timer started |
| `duration` | number | Round duration (always 180000) |

**When Sent**: Broadcast to all when all players are ready in lobby

**Note**: `correctAnswer` and `acceptedAnswers` are NOT sent to clients (prevent cheating)

---

### ANSWER_SUBMITTED

Confirmation that answer was recorded.

```json
{
  "type": "ANSWER_SUBMITTED",
  "payload": {
    "answerText": "Paris",
    "timestamp": 5420
  }
}
```

**Payload Schema**:
| Field | Type | Description |
|-------|------|-------------|
| `answerText` | string | The answer that was submitted |
| `timestamp` | number | Milliseconds since round start |

**When Sent**: Sent only to the player who submitted answer

---

### ANSWER_COUNT_UPDATE

Update on how many players have answered.

```json
{
  "type": "ANSWER_COUNT_UPDATE",
  "payload": {
    "answeredCount": 2,
    "totalCount": 3
  }
}
```

**Payload Schema**:
| Field | Type | Description |
|-------|------|-------------|
| `answeredCount` | number | Players who have answered |
| `totalCount` | number | Total players in room |

**When Sent**: Broadcast to all when any player submits answer

---

### ROUND_END

Round ended, here are the results.

```json
{
  "type": "ROUND_END",
  "payload": {
    "correctAnswer": "Paris",
    "acceptedAnswers": ["Paris"],
    "winnerId": "550e8400-e29b-41d4-a716-446655440000",
    "results": [
      {
        "participantId": "550e8400-e29b-41d4-a716-446655440000",
        "participantName": "Alice",
        "answerText": "Paris",
        "timestamp": 5420,
        "isCorrect": true
      },
      {
        "participantId": "650e8400-e29b-41d4-a716-446655440001",
        "participantName": "Bob",
        "answerText": "London",
        "timestamp": 7830,
        "isCorrect": false
      },
      {
        "participantId": "750e8400-e29b-41d4-a716-446655440002",
        "participantName": "Charlie",
        "answerText": null,
        "timestamp": null,
        "isCorrect": false
      }
    ]
  }
}
```

**Payload Schema**:
| Field | Type | Description |
|-------|------|-------------|
| `correctAnswer` | string | The correct answer text |
| `acceptedAnswers` | string[] | All accepted variations of the answer |
| `winnerId` | string \| null | ID of winner, or null if no correct answers |
| `results` | ResultEntry[] | All player results |

**ResultEntry Schema**:
| Field | Type | Description |
|-------|------|-------------|
| `participantId` | string | Player ID |
| `participantName` | string | Player name |
| `answerText` | string \| null | Answer entered, or null if no answer |
| `timestamp` | number \| null | Time to answer (ms), or null |
| `isCorrect` | boolean | Whether answer was correct |

**When Sent**: Broadcast to all when:
- All players have answered, OR
- 3-minute timer expires

---

### PLAYER_LEFT

Player left the room.

```json
{
  "type": "PLAYER_LEFT",
  "payload": {
    "playerId": "650e8400-e29b-41d4-a716-446655440001",
    "playerName": "Bob"
  }
}
```

**Payload Schema**:
| Field | Type | Description |
|-------|------|-------------|
| `playerId` | string | ID of player who left |
| `playerName` | string | Name of player who left |

**When Sent**: Broadcast to remaining players when someone leaves

---

### ERROR

Error message (e.g., invalid action).

```json
{
  "type": "ERROR",
  "payload": {
    "code": "INVALID_ACTION",
    "message": "Cannot answer question in lobby state"
  }
}
```

**Payload Schema**:
| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Error code (INVALID_ACTION, NOT_READY, etc.) |
| `message` | string | Human-readable error message |

**When Sent**: Sent to client that performed invalid action

**Error Codes**:
- `INVALID_ACTION`: Action not allowed in current state
- `NOT_READY`: Tried to start game but not all ready
- `ALREADY_ANSWERED`: Tried to answer twice
- `ROOM_FULL`: Tried to join full room
- `NAME_TAKEN`: Player name already in use

---

## Message Flow Examples

### Example 1: Create Room and Start Game

```
Client A → Server: (HTTP POST /api/room/create)
Server → Client A: { roomCode: "A3B7K9", playerId: "p1", ... }

Client A → Server: (WebSocket connect)
Client A → Server: { type: "JOIN", payload: { playerId: "p1", ... } }
Server → Client A: { type: "ROOM_STATE", payload: { ... } }

Client B → Server: (HTTP POST /api/room/A3B7K9/join)
Server → Client B: { playerId: "p2", ... }

Client B → Server: (WebSocket connect)
Client B → Server: { type: "JOIN", payload: { playerId: "p2", ... } }
Server → Client B: { type: "ROOM_STATE", payload: { ... } }
Server → Client A: { type: "PLAYER_JOINED", payload: { participant: {...} } }

Client A → Server: { type: "READY", payload: { isReady: true } }
Server → All: { type: "PLAYER_READY", payload: { playerId: "p1", isReady: true } }

Client B → Server: { type: "READY", payload: { isReady: true } }
Server → All: { type: "PLAYER_READY", payload: { playerId: "p2", isReady: true } }
Server → All: { type: "GAME_START", payload: { question: {...}, startTime: ..., duration: 180000 } }
```

### Example 2: Answer Question and See Results

```
(Game is active, timer running...)

Client A → Server: { type: "ANSWER", payload: { answerText: "Paris", timestamp: 5420 } }
Server → Client A: { type: "ANSWER_SUBMITTED", payload: { answerText: "Paris", timestamp: 5420 } }
Server → All: { type: "ANSWER_COUNT_UPDATE", payload: { answeredCount: 1, totalCount: 2 } }

Client B → Server: { type: "ANSWER", payload: { answerText: "London", timestamp: 7830 } }
Server → Client B: { type: "ANSWER_SUBMITTED", payload: { answerText: "London", timestamp: 7830 } }
Server → All: { type: "ANSWER_COUNT_UPDATE", payload: { answeredCount: 2, totalCount: 2 } }

(All answered - round ends immediately)
Server → All: { type: "ROUND_END", payload: { correctAnswer: "Paris", acceptedAnswers: ["Paris"], winnerId: "p1", results: [...] } }
Server → All: { type: "ROOM_STATE", payload: { gameState: "results", ... } }
```

### Example 3: Continue to Next Round

```
(Players viewing results...)

Client A → Server: { type: "READY", payload: { isReady: true } }
Server → All: { type: "PLAYER_READY", payload: { playerId: "p1", isReady: true } }

Client B → Server: { type: "READY", payload: { isReady: true } }
Server → All: { type: "PLAYER_READY", payload: { playerId: "p2", isReady: true } }
Server → All: { type: "GAME_START", payload: { question: {...}, ... } }
```

---

## Connection Lifecycle

```
1. [Client] HTTP POST to create/join room
2. [Server] Returns playerId and websocketUrl
3. [Client] Connect WebSocket with playerId
4. [Client] Send JOIN message
5. [Server] Send ROOM_STATE (initial state)
6. [Server] Broadcast PLAYER_JOINED to others
   
   ... (gameplay messages) ...
   
7. [Client] Send LEAVE message OR close WebSocket
8. [Server] Broadcast PLAYER_LEFT
9. [Server] Close WebSocket
```

---

## Reconnection Strategy

**Client-Side**:
1. Detect disconnection (`onclose` event)
2. Wait exponential backoff (1s, 2s, 4s, 8s, 16s max)
3. Attempt reconnect with same `playerId`
4. If successful, server sends latest `ROOM_STATE`
5. Max 5 attempts, then show error

**Server-Side**:
- Mark participant as `connectionStatus: 'disconnected'`
- Keep participant in room for 30 seconds
- If reconnect within 30s, restore state
- If no reconnect, remove from room (broadcast `PLAYER_LEFT`)

---

## Summary

### Client → Server Messages

| Type | Purpose | Valid States |
|------|---------|--------------|
| JOIN | Join room | Initial connection |
| READY | Toggle ready | lobby, results |
| ANSWER | Submit answer | active |
| LEAVE | Leave room | Any |

### Server → Client Messages

| Type | Purpose | Recipients |
|------|---------|------------|
| ROOM_STATE | Full state sync | Individual (on connect) |
| PLAYER_JOINED | New player | All (broadcast) |
| PLAYER_READY | Ready status change | All (broadcast) |
| GAME_START | Round begins | All (broadcast) |
| ANSWER_SUBMITTED | Answer confirmed | Individual |
| ANSWER_COUNT_UPDATE | Progress update | All (broadcast) |
| ROUND_END | Show results | All (broadcast) |
| PLAYER_LEFT | Player disconnected | All (broadcast) |
| ERROR | Error message | Individual |

---

**Ready for**: Quickstart guide and implementation tasks.
