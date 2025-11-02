# HTTP API Contract

**Feature**: 002-express-socketio-migration  
**Date**: 2025-11-01  
**Base URL**: `http://localhost:3001` (development) / `https://api.trivia.app` (production)

## Overview

HTTP endpoints for room creation and validation. Real-time gameplay uses Socket.IO (see `socketio-events.md`).

---

## Endpoints

### POST /api/room/create

Create a new trivia room with a unique 6-character code.

**Authentication**: None

**Request Body**:
```json
{
  "creatorName": "Alice"  // Optional - not used but accepted for future
}
```

**Success Response** (201 Created):
```json
{
  "roomCode": "A3B7K9",
  "shareableUrl": "http://localhost:3000/room/A3B7K9"
}
```

**Error Responses**:

```json
// 503 Service Unavailable - Room limit reached
{
  "error": {
    "code": "ROOM_LIMIT_REACHED",
    "message": "Maximum number of rooms (100) reached. Please try again later."
  }
}
```

```json
// 500 Internal Server Error - Code generation failed
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to create room. Please try again."
  }
}
```

**Implementation Notes**:
- Generates unique 6-character room code
- Checks room count < 100
- Creates room in RoomStore
- Schedules 5-minute cleanup timer
- Returns shareable URL using env-configured frontend URL

---

### GET /api/room/:code/validate

Validate that a room exists and is joinable.

**Authentication**: None

**Path Parameters**:
- `code` (string, required): 6-character room code

**Success Response** (200 OK):
```json
{
  "exists": true,
  "canJoin": true,
  "participantCount": 3,
  "gameState": "lobby"
}
```

**Response when room doesn't exist** (404 Not Found):
```json
{
  "exists": false
}
```

**Response when room is full** (200 OK):
```json
{
  "exists": true,
  "canJoin": false,
  "participantCount": 8,
  "gameState": "lobby",
  "reason": "Room is full"
}
```

**Response when game is in progress** (200 OK):
```json
{
  "exists": true,
  "canJoin": false,
  "participantCount": 5,
  "gameState": "active",
  "reason": "Game in progress"
}
```

**Implementation Notes**:
- Case-insensitive room code lookup
- Returns 404 if room not found
- Returns joinability based on:
  - Room exists
  - Participant count < 8
  - Game state is 'lobby'

---

### POST /api/room/:code/join

**DEPRECATED** - Join logic moved to Socket.IO JOIN event.

This endpoint is kept for backward compatibility but returns redirect to Socket.IO connection.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Connect via WebSocket to join room",
  "socketUrl": "http://localhost:3001"
}
```

---

### GET /health

Health check endpoint for monitoring and load balancers.

**Authentication**: None

**Success Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": 1698624100000,
  "uptime": 3600,
  "rooms": {
    "count": 12,
    "max": 100
  }
}
```

**Implementation Notes**:
- Always returns 200 if server is running
- Includes room count for monitoring
- Uptime in seconds

---

## CORS Configuration

All endpoints support CORS with the following configuration:

**Allowed Origins**:
- Development: `http://localhost:3000`, `http://localhost:3001`
- Production: Configured via `ALLOWED_ORIGINS` environment variable

**Allowed Methods**: `GET`, `POST`, `OPTIONS`

**Allowed Headers**: `Content-Type`, `Authorization`

**Credentials**: Enabled (for future auth implementation)

---

## Error Response Format

All errors follow this consistent format:

```typescript
interface ErrorResponse {
  error: {
    code: string;      // Machine-readable error code
    message: string;   // Human-readable error message
    details?: any;     // Optional additional context
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ROOM_LIMIT_REACHED` | 503 | 100-room limit reached |
| `ROOM_NOT_FOUND` | 404 | Room code doesn't exist |
| `ROOM_FULL` | 400 | Room has 8 participants |
| `GAME_IN_PROGRESS` | 409 | Cannot join during active game |
| `INVALID_REQUEST` | 400 | Malformed request body |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Request Examples

### Create a Room (curl)

```bash
curl -X POST http://localhost:3001/api/room/create \
  -H "Content-Type: application/json" \
  -d '{"creatorName": "Alice"}'
```

### Validate Room (curl)

```bash
curl http://localhost:3001/api/room/A3B7K9/validate
```

### Health Check (curl)

```bash
curl http://localhost:3001/health
```

---

## Integration with Frontend

### Room Creation Flow

```typescript
// apps/frontend/app/lib/api.ts
async function createRoom(): Promise<{ roomCode: string; shareableUrl: string }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/room/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }
  
  return response.json();
}
```

### Room Validation Flow

```typescript
async function validateRoom(code: string): Promise<RoomValidation> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/room/${code}/validate`
  );
  
  if (response.status === 404) {
    return { exists: false };
  }
  
  return response.json();
}
```

---

## Rate Limiting

**Not implemented in MVP** - Future consideration if abuse detected.

Potential limits:
- 10 room creations per IP per minute
- 100 validation requests per IP per minute

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | HTTP server port |
| `FRONTEND_URL` | No | `http://localhost:3000` | For shareable URLs |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | CORS allowed origins (comma-separated) |

---

## OpenAPI Specification

```yaml
openapi: 3.0.0
info:
  title: Trivia Room API
  version: 1.0.0
  description: HTTP API for trivia room management

servers:
  - url: http://localhost:3001
    description: Development
  - url: https://api.trivia.app
    description: Production

paths:
  /api/room/create:
    post:
      summary: Create a new room
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                creatorName:
                  type: string
                  example: "Alice"
      responses:
        '201':
          description: Room created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  roomCode:
                    type: string
                    example: "A3B7K9"
                  shareableUrl:
                    type: string
                    example: "http://localhost:3000/room/A3B7K9"
        '503':
          description: Room limit reached
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
  
  /api/room/{code}/validate:
    get:
      summary: Validate room existence and joinability
      parameters:
        - name: code
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Room validation result
          content:
            application/json:
              schema:
                type: object
                properties:
                  exists:
                    type: boolean
                  canJoin:
                    type: boolean
                  participantCount:
                    type: integer
                  gameState:
                    type: string
                    enum: [lobby, active, results]
        '404':
          description: Room not found
          content:
            application/json:
              schema:
                type: object
                properties:
                  exists:
                    type: boolean
                    example: false
  
  /health:
    get:
      summary: Health check
      responses:
        '200':
          description: Server is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: "healthy"
                  timestamp:
                    type: integer
                  uptime:
                    type: integer
                  rooms:
                    type: object
                    properties:
                      count:
                        type: integer
                      max:
                        type: integer

components:
  schemas:
    Error:
      type: object
      properties:
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
```

---

## Migration from Durable Objects

### Changes from Spec 001

- **Removed**: `POST /api/room/{code}/join` (HTTP join endpoint)
  - **Reason**: Join logic now happens via Socket.IO JOIN event
  - **Compatibility**: Endpoint returns redirect message

- **Added**: `GET /api/room/{code}/validate`
  - **Reason**: Frontend can check room before establishing Socket connection
  
- **Added**: `GET /health`
  - **Reason**: Standard monitoring endpoint

- **Preserved**: Room creation endpoint signature
  - **Reason**: Maintains frontend compatibility

### Breaking Changes

None - all existing frontend calls remain compatible.
