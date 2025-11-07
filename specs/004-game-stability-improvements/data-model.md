# Data Model: Game Stability and Customization Improvements

**Feature**: 004-game-stability-improvements  
**Date**: November 6, 2025  
**Purpose**: Define entity structures, relationships, and state transitions

## Entity Changes

### 1. Participant (Modified)

**Location**: `apps/backend/src/types/room.types.ts`

**Purpose**: Represents a player in a room with enhanced role and connection tracking

```typescript
export type ParticipantRole = 'active' | 'spectator';
export type ConnectionStatus = 'connected' | 'disconnected';

export interface Participant {
  id: string;                           // UUID, stable across reconnections
  name: string;                         // Display name
  role: ParticipantRole;                // NEW: 'active' can answer, 'spectator' watches only
  connectionStatus: ConnectionStatus;   // MODIFIED: Explicit type (was inferred)
  score: number;                        // Total points
  roundsWon: number;                    // Number of rounds won
  isReady: boolean;                     // Ready status in lobby
  userId: string | null;                // Clerk user ID (null for anonymous)
  joinedAt: number;                     // Timestamp of first join
  lastWinTimestamp: number | null;      // Timestamp of most recent round win
}
```

**Validation Rules**:
- `id`: Must be unique within room, immutable
- `name`: Required, 1-50 characters
- `role`: Must be 'active' or 'spectator'
- `connectionStatus`: Must be 'connected' or 'disconnected'
- `score`: Non-negative integer
- `roundsWon`: Non-negative integer
- `userId`: If provided, must be valid Clerk user ID
- `joinedAt`: Positive timestamp

**State Transitions**:
```
Role Transitions:
- Join lobby (< 16 active) → active
- Join lobby (= 16 active) → spectator
- Join during game → spectator
- Spectator when game → lobby → active (if slots available)
- Reconnect during round → spectator
- Spectator at round end → active

Connection Transitions:
- Socket connect → connected
- Socket disconnect → disconnected
- Reconnect → connected
```

### 2. VoteState (New)

**Location**: `apps/backend/src/types/game.types.ts`

**Purpose**: Tracks vote-to-end-game state on results page

```typescript
export interface VoteState {
  votedParticipantIds: Set<string>;    // Participant IDs who have voted
  createdAt: number;                   // When vote state was initialized
  threshold: number;                   // Cached majority threshold
}
```

**Validation Rules**:
- `votedParticipantIds`: Must contain only valid participant IDs from current room
- `createdAt`: Positive timestamp
- `threshold`: Positive integer, recalculated on connection changes

**Lifecycle**:
- Created: When results page loads (gameState transitions to 'results')
- Updated: When participant votes or connection status changes
- Destroyed: When vote succeeds, game ends, or players ready up for next round

### 3. Room (Modified)

**Location**: `apps/backend/src/types/room.types.ts`

**Purpose**: Extended with category, feedback mode, vote state, cleanup timer, and player limit

```typescript
export interface Room {
  code: string;                         // Unique 6-character room code
  participants: Map<string, Participant>; // Participant ID → Participant
  gameState: GameState;                 // 'lobby' | 'active' | 'results'
  currentQuestion: Question | null;     // Current question being answered
  currentRound: Round | null;           // Current round data
  usedQuestionIds: string[];            // Questions already used in this session
  createdAt: number;                    // Room creation timestamp
  lastActivityAt: number;               // Last activity timestamp
  groupId: string | null;               // Associated group ID (for group rooms)
  createdBy: string;                    // User ID of room creator
  roastMode: boolean;                   // DEPRECATED: Use feedbackMode instead
  
  // NEW FIELDS
  selectedCategory: string | null;      // Question category filter (null = mixed)
  feedbackMode: 'supportive' | 'neutral' | 'roast'; // AI feedback tone
  voteState: VoteState | null;          // Vote-to-end state (null when not voting)
  cleanupTimer: NodeJS.Timeout | null;  // Cleanup timeout reference
  maxActivePlayers: number;             // Maximum active players (16)
}
```

**Validation Rules**:
- `code`: 6 uppercase alphanumeric characters, unique globally
- `participants`: Map must not exceed maxActivePlayers active participants
- `selectedCategory`: If not null, must exist in database with >=10 questions
- `feedbackMode`: Must be 'supportive', 'neutral', or 'roast'
- `voteState`: Only non-null when gameState === 'results'
- `maxActivePlayers`: Fixed at 16 (const)

**Default Values**:
```typescript
{
  selectedCategory: null,          // Mixed mode by default
  feedbackMode: 'neutral',         // Neutral tone by default
  voteState: null,                 // No active vote
  cleanupTimer: null,              // No cleanup scheduled
  maxActivePlayers: 16,            // Fixed constant
}
```

### 4. Question (Modified - if needed)

**Location**: `apps/backend/prisma/schema.prisma`

**Purpose**: Add category field if not already present

**Check First**: Verify if `category` field exists in current schema

```prisma
model Question {
  id              String   @id @default(uuid())
  text            String
  correctAnswer   String
  acceptedAnswers String[]
  category        String   // NEW: Question category (e.g., "Science", "History")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([category])  // Index for efficient filtering
}
```

**Validation Rules**:
- `category`: Required, non-empty string, 1-50 characters
- Categories must have at least 10 questions to be selectable

**Migration Strategy**:
- If field exists: No migration needed
- If field missing: Add field with migration, populate existing questions with "General" or prompt for categorization

## Relationships

### Participant ↔ Room
- **Type**: Many-to-One (many participants belong to one room)
- **Cardinality**: 0-unlimited participants per room (0-16 active, unlimited spectators)
- **Lifecycle**: Participant exists only while in room, deleted on permanent leave or room cleanup

### VoteState ↔ Room
- **Type**: One-to-One (room has at most one vote state)
- **Cardinality**: 0-1 vote state per room
- **Lifecycle**: Created on results page load, destroyed on vote success or state transition

### Room ↔ Question (via category)
- **Type**: Many-to-Many (room can use many questions, questions can be in many rooms)
- **Cardinality**: 1-N questions per room session, filtered by selectedCategory
- **Lifecycle**: Questions are immutable, room tracks usedQuestionIds to avoid repetition

## State Machine: Game Flow with New Features

```
┌─────────────────────────────────────────────────────────────────┐
│                          LOBBY STATE                            │
│  - Players join (active if < 16, else spectator)               │
│  - Players mark ready                                           │
│  - Category and feedback mode displayed                         │
│  - Spectators wait                                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │ All active players ready (min 2)
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                         ACTIVE STATE                             │
│  - Question displayed to all (active + spectator)               │
│  - Active players can answer                                    │
│  - Spectators see question but cannot answer                    │
│  - Timer runs (3 minutes)                                       │
│  - Disconnections handled gracefully                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Round timer expires OR all active answered
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                        RESULTS STATE                             │
│  - Round results shown (winner, correct answer, leaderboard)    │
│  - Vote-to-end button appears                                   │
│  - Active players can vote (spectators cannot)                  │
│  - Players can ready up for next round                          │
└──────────────┬────────────────────┬─────────────────────────────┘
               │ Vote succeeds      │ Players ready up
               ↓                    ↓
        ┌──────────┐         ┌──────────┐
        │ Game End │         │  ACTIVE  │ (next round)
        │ → LOBBY  │         │  STATE   │
        └──────────┘         └──────────┘
```

### Role State Machine

```
                    ┌──────────────────────────┐
                    │   ACTIVE PARTICIPANT     │
                    │  (can answer questions)  │
                    └───────┬──────────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
    Disconnect  │    Game   │    Rejoin │  Ready up
    mid-round   │    ends   │    mid-   │  for next
                │           │    round  │  round
                ↓           ↓           ↓
        ┌────────────┐ ┌────────────┐ ┌────────────┐
        │ SPECTATOR  │ │   LOBBY    │ │  SPECTATOR │
        │ (temp)     │ │            │ │ (rejoined) │
        └────┬───────┘ └──────┬─────┘ └──────┬─────┘
             │                │                │
             │ Round ends     │ Slots avail    │ Next round
             └────────────────┼────────────────┘
                              ↓
                    ┌──────────────────────┐
                    │  ACTIVE PARTICIPANT  │
                    └──────────────────────┘
```

## Index Strategy

### In-Memory (Map-based)
- `Room.participants`: Map<string (participant ID), Participant> - O(1) lookup
- `roomStore.rooms`: Map<string (room code), Room> - O(1) lookup
- `VoteState.votedParticipantIds`: Set<string> - O(1) add/remove/check

### Database (Prisma/PostgreSQL)
```prisma
// Existing indexes (assumed)
@@index([id]) on Question
@@index([groupId]) on Group
@@index([userId, groupId]) on Membership

// NEW index (if Question.category added)
@@index([category]) on Question  // For efficient category filtering
```

## Data Constraints Summary

| Entity | Field | Constraint |
|--------|-------|------------|
| Participant | role | 'active' \| 'spectator' |
| Participant | connectionStatus | 'connected' \| 'disconnected' |
| Participant | id | Unique within room |
| Room | selectedCategory | Must exist with >=10 questions |
| Room | feedbackMode | 'supportive' \| 'neutral' \| 'roast' |
| Room | maxActivePlayers | Fixed at 16 |
| Room | active participant count | <= maxActivePlayers |
| Room | voteState | Non-null only when gameState === 'results' |
| VoteState | threshold | Math.ceil(activeConnectedCount / 2) |
| Question | category | Required if implementing category feature |

## Storage Considerations

### In-Memory (Current)
- **Size**: ~1-2KB per participant, ~5-10KB per room with 16 players
- **Retention**: 5 minutes after last player disconnects
- **Persistence**: None (intentional - ephemeral game sessions)

### Database (Persistent)
- **Question.category**: Indexed string field, minimal storage impact
- **No new tables**: All runtime state remains in-memory

### Socket.data (Per-Connection)
```typescript
socket.data: {
  roomCode: string;      // 6 chars
  playerId: string;      // UUID
  userId: string | null; // UUID or null
}
// ~100 bytes per socket
```

## Migration Plan

### Phase 1: Backend Schema
1. **Check Question schema**: Verify if `category` field exists
2. **If missing**: Create migration to add `category` field with default value
3. **Populate categories**: Run script to categorize existing questions or set all to "General"
4. **Validate**: Ensure no category has < 10 questions (merge or alert)

### Phase 2: Type Definitions
1. Update `room.types.ts` with new Participant and Room fields
2. Create `game.types.ts` with VoteState interface
3. Add type guards for role and connectionStatus

### Phase 3: Backwards Compatibility
1. Map `roastMode: true` → `feedbackMode: 'roast'` in room creation
2. Default `selectedCategory: null` for existing rooms (mixed mode)
3. Default `feedbackMode: 'neutral'` for existing rooms

## Validation Rules Implementation

### Server-Side (Prisma/TypeScript)
```typescript
// Room creation validation
function validateRoomConfig(config: {
  selectedCategory?: string | null;
  feedbackMode?: string;
}): ValidationResult {
  if (config.selectedCategory) {
    const questionCount = await prisma.question.count({
      where: { category: config.selectedCategory }
    });
    if (questionCount < 10) {
      return { valid: false, error: 'Category must have at least 10 questions' };
    }
  }
  
  if (config.feedbackMode && !['supportive', 'neutral', 'roast'].includes(config.feedbackMode)) {
    return { valid: false, error: 'Invalid feedback mode' };
  }
  
  return { valid: true };
}

// Participant role enforcement
function canJoinAsActive(room: Room): boolean {
  const activeCount = Array.from(room.participants.values())
    .filter(p => p.role === 'active').length;
  return activeCount < room.maxActivePlayers;
}

// Vote authorization
function canVote(participant: Participant): boolean {
  return participant.role === 'active' && 
         participant.connectionStatus === 'connected';
}
```

## Summary

Data model changes are **additive and backwards compatible**:
- Participant gains `role` field (defaults to 'active' for existing logic)
- Room gains optional configuration fields with sensible defaults
- New VoteState entity is purely additive (null when not voting)
- Question may need category field (migration required if missing)
- No breaking changes to existing functionality

All constraints are enforceable at runtime through TypeScript types and server-side validation. State machine is clear and testable. Ready to proceed to contracts definition.
