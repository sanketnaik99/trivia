# API Contracts: HTTP Endpoints

**Feature**: 001-trivia-room-system  
**Date**: 2025-10-30

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://trivia-app.example.com/api`

---

## POST /room/create

Create a new trivia room and return room code.

### Request

**Method**: `POST`  
**Path**: `/api/room/create`  
**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "playerName": "Alice"
}
```

**Body Schema**:
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `playerName` | string | Yes | Length 1-20 characters |

### Response

**Success (201 Created)**:
```json
{
  "roomCode": "A3B7K9",
  "playerId": "550e8400-e29b-41d4-a716-446655440000",
  "websocketUrl": "wss://trivia-ws.example.com/room/A3B7K9"
}
```

**Response Schema**:
| Field | Type | Description |
|-------|------|-------------|
| `roomCode` | string | 6-character room identifier |
| `playerId` | string | UUID for the player |
| `websocketUrl` | string | WebSocket URL to connect to |

**Error Responses**:

**400 Bad Request** (Invalid player name):
```json
{
  "error": "Invalid player name",
  "message": "Player name must be between 1 and 20 characters"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to create room",
  "message": "Unable to initialize room. Please try again."
}
```

### Example

```bash
curl -X POST http://localhost:3000/api/room/create \
  -H "Content-Type: application/json" \
  -d '{"playerName": "Alice"}'
```

---

## GET /room/[code]

Validate that a room exists and is joinable.

### Request

**Method**: `GET`  
**Path**: `/api/room/{code}`  
**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | 6-character room code (e.g., "A3B7K9") |

**Headers**: None required

### Response

**Success (200 OK)**:
```json
{
  "exists": true,
  "roomCode": "A3B7K9",
  "participantCount": 3,
  "gameState": "lobby",
  "canJoin": true,
  "websocketUrl": "wss://trivia-ws.example.com/room/A3B7K9"
}
```

**Response Schema**:
| Field | Type | Description |
|-------|------|-------------|
| `exists` | boolean | Whether room exists |
| `roomCode` | string | The room code |
| `participantCount` | number | Current number of players |
| `gameState` | string | Current state: 'lobby', 'active', 'results' |
| `canJoin` | boolean | Whether room is joinable (not full, not in-game) |
| `websocketUrl` | string | WebSocket URL to connect to |

**Error Responses**:

**404 Not Found** (Room doesn't exist):
```json
{
  "exists": false,
  "error": "Room not found",
  "message": "No room found with code A3B7K9"
}
```

**400 Bad Request** (Invalid code format):
```json
{
  "error": "Invalid room code",
  "message": "Room code must be 6 characters"
}
```

### Example

```bash
curl http://localhost:3000/api/room/A3B7K9
```

---

## POST /room/[code]/join

Join an existing room (called before WebSocket connection).

### Request

**Method**: `POST`  
**Path**: `/api/room/{code}/join`  
**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | 6-character room code |

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "playerName": "Bob"
}
```

**Body Schema**:
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `playerName` | string | Yes | Length 1-20 characters, unique in room |

### Response

**Success (200 OK)**:
```json
{
  "playerId": "650e8400-e29b-41d4-a716-446655440001",
  "roomCode": "A3B7K9",
  "websocketUrl": "wss://trivia-ws.example.com/room/A3B7K9"
}
```

**Response Schema**:
| Field | Type | Description |
|-------|------|-------------|
| `playerId` | string | UUID for the player |
| `roomCode` | string | Confirmed room code |
| `websocketUrl` | string | WebSocket URL to connect to |

**Error Responses**:

**404 Not Found**:
```json
{
  "error": "Room not found",
  "message": "No room found with code A3B7K9"
}
```

**400 Bad Request** (Room full):
```json
{
  "error": "Room full",
  "message": "This room already has 8 players"
}
```

**400 Bad Request** (Name taken):
```json
{
  "error": "Name already taken",
  "message": "A player named 'Bob' is already in this room"
}
```

**409 Conflict** (Game in progress):
```json
{
  "error": "Game in progress",
  "message": "Cannot join room while game is active"
}
```

### Example

```bash
curl -X POST http://localhost:3000/api/room/A3B7K9/join \
  -H "Content-Type: application/json" \
  -d '{"playerName": "Bob"}'
```

---

## Summary

### HTTP Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/room/create` | Create new room |
| GET | `/api/room/{code}` | Validate room exists |
| POST | `/api/room/{code}/join` | Join room (pre-WebSocket) |

### Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, POST join) |
| 201 | Created (POST create) |
| 400 | Bad Request (validation error) |
| 404 | Not Found (room doesn't exist) |
| 409 | Conflict (game in progress) |
| 500 | Internal Server Error |

### Security Considerations

- Rate limiting: Prevent spam room creation (10 rooms/minute per IP)
- Input validation: Sanitize player names (no XSS)
- Room code uniqueness: Check before creating
- Duplicate name check: Enforce within room

---

**Next**: See `websocket-protocol.md` for real-time message contracts.
