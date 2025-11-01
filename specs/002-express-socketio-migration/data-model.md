# Data Model: Express + Socket.IO Migration

**Feature**: 002-express-socketio-migration  
**Date**: 2025-11-01  
**Storage**: In-memory (Map-based)

## Overview

This document defines the data structures for room management, participant tracking, score accumulation, and game state. All data is stored in-memory with no persistence layer.

---

## Entity: Room

Represents a trivia game session with participants, game state, and history.

### Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `code` | string | Yes | 6-character unique room identifier | Uppercase alphanumeric, no 0/O/I/1/L |
| `participants` | Map<string, Participant> | Yes | All participants indexed by ID | Max 8 participants |
| `gameState` | GameState | Yes | Current phase of the game | One of: 'lobby', 'active', 'results' |
| `currentQuestion` | Question \| null | No | Active question during gameplay | Required when gameState='active' |
| `currentRound` | Round \| null | No | Active round data | Required when gameState='active' or 'results' |
| `usedQuestionIds` | string[] | Yes | Questions already used in this room | Prevents repeats |
| `createdAt` | number | Yes | Unix timestamp (ms) of room creation | Used for analytics |
| `lastActivityAt` | number | Yes | Unix timestamp (ms) of last participant action | For cleanup scheduling |

### Relationships

- **Has many** Participants (composition - participants deleted with room)
- **Has one** Current Question (reference)
- **Has one** Current Round (composition)

### State Transitions

```
[Created] → lobby
  ↓
  (All players ready)
  ↓
lobby → active
  ↓
  (All answered OR timer expires)
  ↓
active → results
  ↓
  (All players ready)
  ↓
results → lobby (next round starts)
```

### Lifecycle Rules

- **Creation**: Room created when first user requests it via HTTP POST
- **Cleanup Trigger**: No participants connected for 5 minutes
- **Max Rooms**: System enforces 100 concurrent rooms maximum
- **Deletion**: Room deleted when cleanup timer fires or all participants leave

---

## Entity: Participant

Represents a player in a room with connection status and cumulative score.

### Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | string | Yes | Unique participant identifier (UUID) | Generated server-side |
| `name` | string | Yes | Display name chosen by player | 1-20 characters, trimmed |
| `isReady` | boolean | Yes | Whether player is ready for next round | Default: false |
| `connectionStatus` | ConnectionStatus | Yes | Current connection state | One of: 'connected', 'disconnected' |
| `score` | number | Yes | Cumulative points across all rounds | Default: 0, increments by 1 per win |
| `roundsWon` | number | Yes | Total number of rounds won | Default: 0, used for UI display |
| `lastWinTimestamp` | number \| null | No | Unix timestamp (ms) of most recent win | For tie-breaking |
| `joinedAt` | number | Yes | Unix timestamp (ms) when joined room | Used for analytics |

### Relationships

- **Belongs to** Room (via room code)
- **Has many** Participant Answers (within rounds)

### Validation Rules

- **Name uniqueness**: Must be unique within room (case-insensitive)
- **Ready state**: Can only toggle in 'lobby' or 'results' game states
- **Score**: Cannot be negative, only increments by 1
- **Tie-breaking**: When scores equal, most recent `lastWinTimestamp` ranks higher

### Lifecycle Rules

- **Creation**: Participant created on successful JOIN message
- **Reconnection**: If same `id` rejoins within 30 seconds, restore existing participant
- **Disconnection**: Mark `connectionStatus='disconnected'`, start 30-second timer
- **Removal**: Delete participant if disconnected for >30 seconds OR user sends LEAVE

---

## Entity: Question

Represents a trivia question with correct answer and accepted alternatives.

### Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | string | Yes | Unique question identifier | Must match questions.json |
| `text` | string | Yes | The trivia question | Non-empty string |
| `correctAnswer` | string | Yes | Canonical correct answer | Used for scoring |
| `acceptedAnswers` | string[] | No | Alternative correct answers | Case-insensitive matching |

### Source

Questions loaded from `apps/backend/src/config/questions.json` (copied from `workers/questions.json`).

### Selection Logic

- **Random selection**: From unused questions in current room
- **No repeats**: Track `usedQuestionIds` per room
- **Reset**: When all questions used, clear `usedQuestionIds` and repeat

---

## Entity: Round

Represents one question cycle with participant answers and winner.

### Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `questionId` | string | Yes | Reference to question being asked | Must exist in questions.json |
| `startTime` | number | Yes | Unix timestamp (ms) when round started | For timer display |
| `duration` | number | Yes | Round duration in milliseconds | Always 180000 (3 minutes) |
| `participantAnswers` | ParticipantAnswer[] | Yes | All participant answers | One per participant max |
| `winnerId` | string \| null | Yes | ID of fastest correct answerer | Null if no correct answers |
| `endTime` | number \| null | No | Unix timestamp (ms) when round ended | Set when round completes |

### Relationships

- **Belongs to** Room
- **References** Question
- **Has many** Participant Answers

### Lifecycle Rules

- **Creation**: Round created when game transitions from 'lobby' to 'active'
- **Completion**: Round ends when all participants answer OR 3-minute timer expires
- **Winner Calculation**: Fastest correct answer wins (based on timestamp)
- **Cleanup**: Round data cleared when transitioning back to 'lobby'

---

## Entity: ParticipantAnswer

Represents one participant's answer submission for a round.

### Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `participantId` | string | Yes | ID of participant who answered | Must exist in room |
| `answerText` | string \| null | Yes | Answer submitted (null if no answer) | Null if timer expired before submission |
| `timestamp` | number \| null | Yes | Milliseconds from round start | Null if no answer, 0-180000 if answered |
| `isCorrect` | boolean | Yes | Whether answer matched correct answer | Based on normalized comparison |

### Answer Validation Logic

```typescript
function checkAnswer(userAnswer: string, question: Question): boolean {
  const normalized = userAnswer.trim().toLowerCase();
  const correctNormalized = question.correctAnswer.trim().toLowerCase();
  
  if (normalized === correctNormalized) return true;
  
  return question.acceptedAnswers?.some(
    alt => alt.trim().toLowerCase() === normalized
  ) ?? false;
}
```

### Lifecycle Rules

- **Creation**: Answer created when participant submits via ANSWER message
- **One per participant**: Cannot submit multiple answers for same round
- **Empty answer**: If participant doesn't answer, answer created with null values at round end

---

## Entity: Score (Derived)

Score is not stored separately but derived from Participant entity. Leaderboard computed on-demand.

### Leaderboard Calculation

```typescript
function getLeaderboard(participants: Participant[]): LeaderboardEntry[] {
  return participants
    .map(p => ({
      participantId: p.id,
      participantName: p.name,
      score: p.score,
      roundsWon: p.roundsWon,
      ranking: 0, // Computed below
    }))
    .sort((a, b) => {
      // Primary: Score descending
      if (a.score !== b.score) return b.score - a.score;
      
      // Tie-breaker: Most recent win (recency)
      const aTimestamp = participants.find(p => p.id === a.participantId)?.lastWinTimestamp ?? 0;
      const bTimestamp = participants.find(p => p.id === b.participantId)?.lastWinTimestamp ?? 0;
      return bTimestamp - aTimestamp;
    })
    .map((entry, index) => ({
      ...entry,
      ranking: index + 1,
    }));
}
```

### Score Update Rules

- **Win**: Winner receives +1 point, `roundsWon` increments, `lastWinTimestamp` updated
- **No win**: Score unchanged
- **Display**: Score shown next to name in lobby and results
- **Persistence**: Score resets to 0 if room recreated or all players leave

---

## Type Definitions

### Enums

```typescript
type GameState = 'lobby' | 'active' | 'results';
type ConnectionStatus = 'connected' | 'disconnected';
```

### Supporting Types

```typescript
interface LeaderboardEntry {
  participantId: string;
  participantName: string;
  score: number;
  roundsWon: number;
  ranking: number;
}
```

---

## Storage Implementation

### RoomStore Class

```typescript
class RoomStore {
  private rooms: Map<string, Room> = new Map();
  private cleanupTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // CRUD operations
  createRoom(code: string): Room;
  getRoom(code: string): Room | undefined;
  deleteRoom(code: string): void;
  getRoomCount(): number;
  
  // Lifecycle management
  scheduleCleanup(code: string, delayMs: number): void;
  cancelCleanup(code: string): void;
  updateLastActivity(code: string): void;
}
```

### Concurrency Considerations

- **Single-threaded**: Node.js event loop eliminates race conditions
- **Atomic operations**: Map operations are atomic within event loop tick
- **No locks needed**: In-memory Map access is synchronous

---

## Data Flow Example

### Creating a Room and Winning a Round

```
1. User → HTTP POST /api/room/create
   ↓
2. Server: Generate room code, create Room entity
   ↓
3. Server: Return room code to user
   ↓
4. User → Socket JOIN with room code
   ↓
5. Server: Create Participant entity, add to Room.participants
   ↓
6. Server: Broadcast PLAYER_JOINED to room
   ↓
7. User → Socket READY
   ↓
8. Server: Set Participant.isReady = true
   ↓
9. All ready → Server: Create Round, transition to 'active'
   ↓
10. Server: Broadcast GAME_START with question
    ↓
11. User → Socket ANSWER with answerText and timestamp
    ↓
12. Server: Create ParticipantAnswer, check correctness
    ↓
13. All answered → Server: Determine winner (fastest correct)
    ↓
14. Server: Update winner's score, roundsWon, lastWinTimestamp
    ↓
15. Server: Broadcast ROUND_END with winner and leaderboard
```

---

## Migration Notes

### Differences from Durable Objects

- **Storage location**: In-memory Map instead of Durable Objects storage
- **Score tracking**: NEW - added `score`, `roundsWon`, `lastWinTimestamp` to Participant
- **Cleanup**: Explicit timers instead of automatic hibernation
- **Concurrency**: Single-server model instead of distributed Durable Objects

### Preserved from Spec 001

- Room code format (6 characters)
- Participant structure (name, ready, connection status)
- Question format (text, correctAnswer, acceptedAnswers)
- Round timing (3 minutes)
- Winner calculation (fastest correct answer)

---

## Validation Summary

### Room Level
- ✅ Max 8 participants per room
- ✅ Max 100 concurrent rooms system-wide
- ✅ Unique room codes
- ✅ 5-minute inactivity cleanup

### Participant Level
- ✅ Unique names within room
- ✅ 30-second reconnection window
- ✅ Score cannot be negative
- ✅ Tie-breaking uses recency

### Round Level
- ✅ One answer per participant per round
- ✅ 3-minute duration
- ✅ Only one winner per round
- ✅ Winner receives exactly 1 point

All validation rules are enforced server-side before broadcasting state updates.
