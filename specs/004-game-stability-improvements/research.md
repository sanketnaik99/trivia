# Research: Game Stability and Customization Improvements

**Feature**: 004-game-stability-improvements  
**Date**: November 6, 2025  
**Purpose**: Resolve technical unknowns and establish patterns for implementation

## Research Questions

### 1. Socket.IO Connection State Management

**Question**: What is the best practice for detecting and handling player disconnections in Socket.IO with automatic cleanup and reconnection support?

**Decision**: Use Socket.IO's built-in `disconnect` event with graceful degradation and connection status tracking

**Rationale**:
- Socket.IO automatically detects disconnections (network issues, browser close, page refresh)
- The `disconnect` event fires reliably on both client and server sides
- Socket.IO maintains socket.id which changes on reconnection, so we need to track participant identity separately using userId (for authenticated users) or a stable participantId stored in socket.data
- 5-second detection window aligns with Socket.IO's default heartbeat mechanisms

**Implementation Pattern**:
```typescript
// Store participant identity in socket.data for reconnection tracking
socket.data = { roomCode, playerId, userId };

// On disconnect, mark as disconnected but preserve data
io.on('disconnect', (socket) => {
  const participant = room.participants.get(socket.data.playerId);
  if (participant) {
    participant.connectionStatus = 'disconnected';
    // Keep participant in room for potential reconnection
  }
});

// On reconnect (new socket), match by userId or participantId
io.on('connection', (socket) => {
  // Check if user already exists in room and reconnect them
  const existing = findParticipantByUserId(userId);
  if (existing) {
    existing.connectionStatus = 'connected';
    socket.data = { roomCode, playerId: existing.id, userId };
  }
});
```

**Alternatives Considered**:
- Custom ping/pong heartbeat: More complex, Socket.IO already provides this
- Immediate removal on disconnect: Loses ability to reconnect gracefully
- Client-side only detection: Unreliable, server must be source of truth

### 2. Participant Role State Machine

**Question**: How should we model the state transitions between active player and spectator roles, especially during reconnection?

**Decision**: Add a `role` field to Participant with explicit state machine: `active | spectator`

**Rationale**:
- Clear separation between participants who can answer (active) and those who can only watch (spectator)
- Simple boolean-like state is easier to reason about than complex status combinations
- Role transitions happen at well-defined points: lobby entry, mid-game join, round transitions
- Connection status (`connected | disconnected`) is orthogonal to role and should be tracked separately

**State Transition Rules**:
```
1. Join during lobby → active (if < 16 players) or spectator (if == 16 players)
2. Join during active game → spectator (always)
3. Spectator when game returns to lobby → active (if < 16 players)
4. Disconnect during round → connectionStatus = 'disconnected', role unchanged
5. Reconnect during round → connectionStatus = 'connected', role changes to spectator
6. Spectator at round end → role changes to active for next round
```

**Implementation Pattern**:
```typescript
interface Participant {
  id: string;
  name: string;
  role: 'active' | 'spectator';  // NEW
  connectionStatus: 'connected' | 'disconnected';
  score: number;
  roundsWon: number;
  isReady: boolean;
  userId: string | null;
  joinedAt: number;
  lastWinTimestamp: number | null;
}

// Helper functions for role transitions
function canJoinAsActive(room: Room): boolean {
  const activeCount = Array.from(room.participants.values())
    .filter(p => p.role === 'active').length;
  return activeCount < 16;
}

function transitionSpectatorsToActive(room: Room): void {
  if (room.gameState !== 'lobby') return;
  
  const spectators = Array.from(room.participants.values())
    .filter(p => p.role === 'spectator' && p.connectionStatus === 'connected')
    .sort((a, b) => a.joinedAt - b.joinedAt);  // FIFO
  
  for (const spectator of spectators) {
    if (canJoinAsActive(room)) {
      spectator.role = 'active';
    } else {
      break;
    }
  }
}
```

**Alternatives Considered**:
- Single "status" field combining role and connection: Too ambiguous, hard to query
- Separate "isSpectator" boolean: Less explicit about state machine nature
- Three roles (active/spectator/disconnected): Confuses connection state with participation role

### 3. Vote State Management

**Question**: How should we track and calculate vote-to-end-game state to ensure majority calculation is correct even as players disconnect?

**Decision**: Add VoteState to Room with Set of participantIds who voted, recalculated on every connection change

**Rationale**:
- Set data structure ensures no duplicate votes
- Vote threshold recalculation on disconnect/reconnect keeps state consistent
- Votes only exist on results page (gameState === 'results'), cleared automatically on state transition
- Majority calculated from active+connected players only (not spectators or disconnected)

**Implementation Pattern**:
```typescript
interface VoteState {
  votedParticipantIds: Set<string>;
  createdAt: number;
}

interface Room {
  // ... existing fields
  voteState: VoteState | null;  // null when not on results page
}

function calculateVoteThreshold(room: Room): number {
  const activeConnected = Array.from(room.participants.values())
    .filter(p => p.role === 'active' && p.connectionStatus === 'connected')
    .length;
  return Math.ceil(activeConnected / 2);  // Majority = more than half
}

function handleVote(room: Room, participantId: string): boolean {
  if (room.gameState !== 'results') return false;
  if (!room.voteState) {
    room.voteState = { votedParticipantIds: new Set(), createdAt: Date.now() };
  }
  
  const participant = room.participants.get(participantId);
  if (!participant || participant.role !== 'active' || participant.connectionStatus !== 'disconnected') {
    return false;
  }
  
  // Toggle vote
  if (room.voteState.votedParticipantIds.has(participantId)) {
    room.voteState.votedParticipantIds.delete(participantId);
  } else {
    room.voteState.votedParticipantIds.add(participantId);
  }
  
  // Check if threshold reached
  const threshold = calculateVoteThreshold(room);
  const voteCount = room.voteState.votedParticipantIds.size;
  return voteCount >= threshold;
}

function clearVoteState(room: Room): void {
  room.voteState = null;
}
```

**Alternatives Considered**:
- Array of votes with timestamps: More complex, Set provides cleaner toggle semantics
- Fixed threshold: Doesn't handle dynamic player count changes
- Allow votes during active rounds: UX research shows this is distracting during gameplay

### 4. Question Category Architecture

**Question**: How should question categories be stored and validated to ensure at least 10 questions per selectable category?

**Decision**: Add `category` field to Question entity (or use existing if present), validate on room creation, filter during question selection

**Rationale**:
- Categories are properties of questions, not separate entities (simpler model)
- Validation at room creation prevents users from selecting invalid categories
- Question service already has filtering logic for unused questions, extend it for category
- If database already has categories, use those; otherwise will be added in data model

**Implementation Pattern**:
```typescript
// Database schema (Prisma)
model Question {
  id        String   @id @default(uuid())
  text      String
  correctAnswer String
  acceptedAnswers String[]
  category  String   // NEW or verify exists
  createdAt DateTime @default(now())
}

// Question Service
function getAvailableCategories(minQuestions: number = 10): string[] {
  // Query grouped by category with count
  const categoriesWithCount = prisma.question.groupBy({
    by: ['category'],
    _count: { id: true },
    having: { id: { _count: { gte: minQuestions } } }
  });
  return categoriesWithCount.map(c => c.category);
}

function getRandomUnusedQuestionForRoom(room: Room): Question | null {
  const usedIds = room.usedQuestionIds;
  const categoryFilter = room.selectedCategory 
    ? { category: room.selectedCategory }
    : {};  // No filter if mixed mode
  
  const availableQuestions = questions.filter(q => 
    !usedIds.includes(q.id) && 
    (!categoryFilter.category || q.category === categoryFilter.category)
  );
  
  if (availableQuestions.length === 0) return null;
  return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
}
```

**Alternatives Considered**:
- Separate Category table with relations: Over-engineered for simple string categorization
- Client-side validation only: Unsafe, server must validate
- Dynamic question generation by category: Out of scope, using existing question database

### 5. AI Feedback Mode Integration

**Question**: How should feedback modes be passed to the AI service to control response tone?

**Decision**: Add `feedbackMode` to Room configuration, pass as system prompt modifier to AI service

**Rationale**:
- Feedback mode is room-scoped, not per-answer, so Room is correct location
- AI service already exists (aiService.ts), extend it to accept mode parameter
- System prompt approach allows user to define exact behavior in their AI configuration
- Frontend only needs to store and display the mode, not interpret it

**Implementation Pattern**:
```typescript
// Room type
interface Room {
  // ... existing fields
  feedbackMode: 'supportive' | 'neutral' | 'roast';  // NEW
}

// AI Service modification
async function generateFeedback(
  answer: string,
  correctAnswer: string,
  isCorrect: boolean,
  feedbackMode: 'supportive' | 'neutral' | 'roast'
): Promise<string> {
  // Pass feedbackMode to AI service
  // User controls the actual prompt in their AI configuration
  // This just identifies which mode to use
  
  const systemPrompt = getFeedbackSystemPrompt(feedbackMode);
  // ... call AI service with modified prompt
}

// Room creation
function createRoom(userId: string, groupId: string | null, options: {
  roastMode?: boolean;  // DEPRECATED - map to feedbackMode for backwards compat
  feedbackMode?: 'supportive' | 'neutral' | 'roast';
  selectedCategory?: string | null;
}): Room {
  const feedbackMode = options.feedbackMode || 
    (options.roastMode ? 'roast' : 'neutral');
  
  // ... create room with feedbackMode
}
```

**Alternatives Considered**:
- Per-answer feedback mode selection: Too complex, inconsistent user experience
- Client-side feedback generation: Security risk, AI API keys exposed
- Multiple AI service instances: Wasteful, single service with mode parameter is cleaner

### 6. Browser Refresh Recovery

**Question**: What mechanism ensures players can rejoin their exact participant slot after page refresh?

**Decision**: Store userId in socket.data, match on reconnection; for anonymous users, use participantId in localStorage

**Rationale**:
- Authenticated users: userId is stable across sessions (from Clerk)
- Anonymous users: participantId stored in browser localStorage persists across refresh
- On join, check if participant already exists in room and reconnect instead of creating new entry
- This prevents duplicate entries (FR-009 requirement)

**Implementation Pattern**:
```typescript
// Frontend: Store participantId in localStorage on first join
function handleJoinSuccess(participantId: string, roomCode: string) {
  localStorage.setItem(`participant_${roomCode}`, participantId);
  // ... update UI
}

// Frontend: On reconnect, send stored participantId
function rejoinRoom(roomCode: string) {
  const storedParticipantId = localStorage.getItem(`participant_${roomCode}`);
  socket.emit('JOIN', {
    roomCode,
    participantId: storedParticipantId,  // NEW: include if exists
    playerName: 'Anonymous',  // Still needed for first-time join
  });
}

// Backend: Handle reconnection in JOIN handler
function handleJoin(socket, payload: { roomCode, participantId?, playerName, userId? }) {
  const room = roomStore.getRoom(payload.roomCode);
  
  // Check for existing participant (userId takes precedence)
  let participant = null;
  if (payload.userId) {
    participant = Array.from(room.participants.values())
      .find(p => p.userId === payload.userId);
  } else if (payload.participantId) {
    participant = room.participants.get(payload.participantId);
  }
  
  if (participant) {
    // Reconnection: update socket reference and connection status
    participant.connectionStatus = 'connected';
    socket.data = { roomCode: payload.roomCode, playerId: participant.id, userId: payload.userId };
    socket.emit('ROOM_STATE', getRoomState(room));
  } else {
    // New participant: create normally
    participant = createNewParticipant(payload);
    room.participants.set(participant.id, participant);
  }
}
```

**Alternatives Considered**:
- Session cookies: Requires backend session management, adds complexity
- URL parameters: Exposes participant ID, can be tampered with
- No anonymous reconnection: Poor UX for non-authenticated users

### 7. Empty Room Cleanup

**Question**: How do we implement the 5-minute cleanup timeout efficiently without a background job system?

**Decision**: Use setTimeout on last player disconnect, cancel if anyone rejoins, clean up on timer expiration

**Rationale**:
- Aligns with existing in-memory room architecture (no external job queue needed)
- setTimeout is precise enough for 5-minute window
- Cleanup logic already exists in room store (currently unused or ad-hoc)
- Memory efficient: timer only exists when room is empty

**Implementation Pattern**:
```typescript
interface Room {
  // ... existing fields
  cleanupTimer: NodeJS.Timeout | null;  // NEW
}

function scheduleRoomCleanup(roomCode: string): void {
  const room = roomStore.getRoom(roomCode);
  if (!room) return;
  
  // Cancel existing timer if any
  if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
  }
  
  // Check if room is truly empty
  const connectedCount = Array.from(room.participants.values())
    .filter(p => p.connectionStatus === 'connected').length;
  
  if (connectedCount === 0) {
    room.cleanupTimer = setTimeout(() => {
      roomStore.deleteRoom(roomCode);
      console.log(`Room ${roomCode} cleaned up after 5 minutes of inactivity`);
    }, 5 * 60 * 1000);  // 5 minutes
  }
}

function cancelRoomCleanup(roomCode: string): void {
  const room = roomStore.getRoom(roomCode);
  if (room && room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  }
}

// Call on disconnect
function handleDisconnect(socket) {
  // ... mark participant as disconnected
  scheduleRoomCleanup(roomCode);
}

// Call on (re)connect
function handleJoin(socket, payload) {
  // ... handle join/reconnect
  cancelRoomCleanup(payload.roomCode);
}
```

**Alternatives Considered**:
- Cron job / background worker: Over-engineered for simple timeout, adds infrastructure dependency
- Check on every operation: Inefficient, unnecessary computation
- Immediate cleanup on last disconnect: Prevents 5-minute reconnection window

## Best Practices Applied

### Socket.IO Real-Time Patterns
- **Event naming convention**: Use SCREAMING_SNAKE_CASE for events (existing convention: `ROOM_CREATED`, `PLAYER_JOINED`)
- **Error handling**: Emit `ERROR` event with code and message for client-side handling
- **State synchronization**: Broadcast `ROOM_STATE` whenever room state changes significantly
- **Graceful disconnection**: Always clean up resources and notify other participants

### State Management
- **Single source of truth**: Backend room store is authoritative, frontend reflects it
- **Optimistic updates**: UI updates immediately, rolls back on error
- **Idempotent operations**: Vote toggle, ready state can be called multiple times safely

### UI/UX Patterns
- **Visual hierarchy**: Connection status shown subtly (badge), vote button prominent on results
- **Progressive disclosure**: Spectator mode UI only shown when relevant
- **Contextual actions**: Vote button only appears on results page, not during answering
- **Touch-friendly**: All interactive elements >44px hit target (mobile-first)

### TypeScript Patterns
- **Discriminated unions**: Use for role ('active' | 'spectator') and connection status
- **Readonly modifiers**: For fields that shouldn't change after initialization
- **Strict null checks**: Explicitly handle null/undefined for voteState, selectedCategory

## Performance Considerations

1. **Connection Status Polling**: Use Socket.IO events rather than polling to minimize network traffic
2. **Vote Threshold Calculation**: Calculated on-demand when vote state changes, not cached
3. **Spectator Broadcasting**: Use single broadcast for all spectators rather than individual emits
4. **Category Validation**: Cache available categories list, invalidate when questions are added/removed
5. **Room Cleanup**: Single timer per room, not per participant

## Security Considerations

1. **Participant Identity**: Server validates userId with Clerk, doesn't trust client claims
2. **Vote Authorization**: Server checks role === 'active' and connectionStatus === 'connected' before accepting votes
3. **Room Limit Enforcement**: Server enforces 16 player limit, client UI reflects but doesn't control
4. **Category Validation**: Server validates category exists and has >=10 questions before room creation
5. **Feedback Mode**: Client sends mode string, but server validates against allowed values

## Migration Strategy

**Backwards Compatibility**:
- Existing rooms continue to work (no category = mixed mode, no feedbackMode = neutral)
- `roastMode` boolean maps to feedbackMode.roast for backwards compatibility
- New fields added with sensible defaults

**Database Migration**:
- If Question.category doesn't exist, add with migration
- Populate existing questions with default category or mark for admin categorization
- Run validation query to ensure no category has <10 questions

**Deployment**:
- Backend changes deployed first (additive, won't break existing clients)
- Frontend changes deployed second (can consume new backend features)
- No downtime required (real-time connections remain stable)

## Summary

All research questions resolved with clear implementation patterns. No external dependencies required. Architecture builds naturally on existing Socket.IO + Prisma + Next.js stack. Ready to proceed to Phase 1: Data Model and Contracts.
