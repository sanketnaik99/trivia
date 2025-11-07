# Socket.IO Event Contract: Game Stability and Customization Improvements

**Feature**: 004-game-stability-improvements  
**Date**: November 6, 2025  
**Transport**: Socket.IO 4.6.1 (server), 4.8.1 (client)

## Overview

Socket.IO events for real-time game functionality including reconnection, spectator mode, voting, and room customization.

## Connection Events

### `connect`

**Direction**: Client → Server (automatic)

**Purpose**: Establish Socket.IO connection

**Client Payload**: None (automatic)

**Server Behavior**:
- Assigns `socket.id`
- Initializes connection state
- Awaits subsequent events (JOIN, RECONNECT)

---

### `disconnect`

**Direction**: Client → Server (automatic)

**Purpose**: Handle graceful/ungraceful disconnections

**Client Payload**: 
```typescript
{
  reason: string  // 'transport close', 'client namespace disconnect', etc.
}
```

**Server Behavior**:
1. Mark participant as `connectionStatus: 'disconnected'`
2. **Do NOT remove from room.participants**
3. Broadcast `PARTICIPANT_LEFT` to room
4. If room becomes empty, start 5-minute cleanup timer
5. Exclude disconnected participant from round completion checks

**Broadcast**:
```typescript
// To all clients in room
socket.to(roomCode).emit('PARTICIPANT_LEFT', {
  userId: 'user-uuid',
  connectionStatus: 'disconnected',
  timestamp: Date.now()
});
```

**Notes**:
- Disconnected participants remain in room for reconnection
- Active rounds continue without disconnected players
- Cleanup timer cancels if anyone reconnects

---

## Room Events

### `CREATE_ROOM`

**Direction**: Client → Server

**Purpose**: Create new group room with configuration

**Client Payload**:
```typescript
{
  groupId: string;  // Required
  selectedCategory?: string;  // NEW: Optional category filter
  feedbackMode?: 'supportive' | 'neutral' | 'roast';  // NEW: Default 'neutral'
}
```

**Server Validation**:
- `groupId` must exist and user must be member
- `selectedCategory` (if provided) must have >=10 questions in database
- `feedbackMode` must be one of three allowed values

**Server Response** (acknowledgment):
```typescript
{
  success: true,
  room: {
    code: 'ABC123',
    groupId: 'group-uuid',
    groupName: 'My Group',
    selectedCategory: 'Science',  // or null
    feedbackMode: 'neutral',
    maxActivePlayers: 16,
    participants: [],
    gameState: 'lobby',
    createdAt: 1699286400000
  }
}
```

**Error Response**:
```typescript
{
  success: false,
  error: 'INVALID_CATEGORY',
  message: 'Category "InvalidCat" not found or has fewer than 10 questions'
}
```

**Possible Errors**:
- `INVALID_GROUP`: User not member of group
- `INVALID_CATEGORY`: Category doesn't exist or <10 questions
- `INVALID_FEEDBACK_MODE`: Not in allowed set
- `ROOM_LIMIT_EXCEEDED`: Server has 100+ active rooms

---

### `JOIN`

**Direction**: Client → Server

**Purpose**: Join existing room (new connection or reconnection)

**Client Payload**:
```typescript
{
  code: string;                    // Room code (required)
  participantId?: string;          // NEW: For anonymous reconnection
  forceReconnect?: boolean;        // NEW: Explicit reconnection attempt
}
```

**Server Logic**:

1. **Reconnection Detection** (Priority):
   - Check `req.userId` (Clerk authenticated) OR `participantId` (anonymous)
   - If participant exists in room with `connectionStatus: 'disconnected'`:
     - Update `connectionStatus: 'connected'`
     - Update `socketId: socket.id`
     - **If `gameState === 'active'` AND participant is mid-round**: Set `role: 'spectator'`
     - Cancel room cleanup timer if running
     - Emit `RECONNECTED` acknowledgment

2. **New Join** (if not reconnection):
   - Count active participants: `participants.filter(p => p.role === 'active').length`
   - If count >= 16: Set `role: 'spectator'`
   - If count < 16 AND `gameState === 'lobby'`: Set `role: 'active'`
   - If count < 16 AND `gameState === 'active'`: Set `role: 'spectator'` (join mid-game)
   - Add to `room.participants` array

3. **Broadcast** (both cases):
   - Emit `PARTICIPANT_JOINED` to all room clients
   - Emit `ROOM_STATE` to joining client

**Reconnection Response**:
```typescript
{
  success: true,
  reconnected: true,
  participant: {
    userId: 'user-uuid',
    username: 'JohnDoe',
    role: 'spectator',  // May have changed to spectator if mid-round
    connectionStatus: 'connected',
    score: 150,
    isReady: false
  },
  room: { /* full room state */ }
}
```

**New Join Response**:
```typescript
{
  success: true,
  reconnected: false,
  participant: {
    participantId: 'participant-uuid',  // Store this in localStorage!
    role: 'spectator',  // or 'active' if lobby and <16 players
    connectionStatus: 'connected',
    score: 0,
    isReady: false
  },
  room: { /* full room state */ }
}
```

**Broadcast** (to all clients in room):
```typescript
socket.to(roomCode).emit('PARTICIPANT_JOINED', {
  participant: {
    userId: 'user-uuid',
    username: 'JohnDoe',
    role: 'spectator',
    connectionStatus: 'connected',
    avatarUrl: 'https://...'
  },
  totalParticipants: 12,
  activeParticipants: 9,
  spectatorParticipants: 3
});
```

**Error Responses**:
```typescript
// Room not found
{ success: false, error: 'ROOM_NOT_FOUND' }

// Room at capacity (16 active, join as spectator instead)
// (Not actually an error - auto-assigns spectator)
```

---

### `LEAVE_ROOM`

**Direction**: Client → Server

**Purpose**: Explicitly leave room (graceful exit)

**Client Payload**:
```typescript
{
  code: string;  // Room code
}
```

**Server Behavior**:
- Remove participant from `room.participants` array
- If participant was voting, remove from `voteState.votedParticipantIds`
- Broadcast `PARTICIPANT_LEFT` with `connectionStatus: 'left'` (permanent)
- Start cleanup timer if room becomes empty
- Socket leaves room namespace

**Server Response**:
```typescript
{
  success: true
}
```

**Broadcast**:
```typescript
socket.to(roomCode).emit('PARTICIPANT_LEFT', {
  userId: 'user-uuid',
  connectionStatus: 'left',  // Permanent departure
  timestamp: Date.now()
});
```

---

## Game Events

### `PLAYER_READY`

**Direction**: Client → Server

**Purpose**: Toggle ready status in lobby

**Client Payload**:
```typescript
{
  code: string;  // Room code
}
```

**Server Behavior**:
- Toggle `participant.isReady` boolean
- **NEW**: Clear `room.voteState` if it exists (cancel vote-to-end when readying up)
- If all **active** participants ready AND count >= 2: Auto-start game
- Broadcast `ROOM_STATE` to all clients

**Server Response**:
```typescript
{
  success: true,
  isReady: true,  // New ready state
  allReady: false,  // Whether all active players ready
  voteCleared: true  // Whether vote-to-end was cleared
}
```

**Broadcast**:
```typescript
socket.to(roomCode).emit('ROOM_STATE', {
  participants: [ /* updated ready states */ ],
  gameState: 'lobby',  // or 'active' if auto-started
  voteState: null  // Cleared
});
```

**Notes**:
- Only **active** participants count toward "all ready" check
- Spectators cannot ready up
- Readying up clears any active vote-to-end

---

### `START_GAME`

**Direction**: Client → Server

**Purpose**: Manually start game (host only)

**Client Payload**:
```typescript
{
  code: string;  // Room code
}
```

**Server Validation**:
- Requester must be host (`room.hostId === req.userId`)
- At least 2 **active** participants required
- `gameState` must be 'lobby'

**Server Behavior**:
1. Set `gameState: 'active'`
2. Fetch questions filtered by `room.selectedCategory` (if set)
3. Initialize first question
4. Reset all participant scores to 0
5. Set all participants to `isReady: false`
6. Clear `room.voteState` if exists
7. Start 15-second question timer
8. Broadcast `GAME_STARTED`

**Server Response**:
```typescript
{
  success: true
}
```

**Broadcast**:
```typescript
socket.to(roomCode).emit('GAME_STARTED', {
  question: {
    id: 'question-uuid',
    text: 'What is the capital of France?',
    choices: ['London', 'Paris', 'Berlin', 'Madrid'],
    timeLimit: 15000,
    category: 'Geography'  // NEW: Category included
  },
  gameState: 'active',
  totalQuestions: 10,
  currentQuestionIndex: 0
});
```

**Error Responses**:
```typescript
{ success: false, error: 'NOT_HOST' }
{ success: false, error: 'INSUFFICIENT_PLAYERS' }  // <2 active players
{ success: false, error: 'INVALID_STATE' }  // Not in lobby
{ success: false, error: 'NO_QUESTIONS' }  // Category has no questions
```

---

### `SUBMIT_ANSWER`

**Direction**: Client → Server

**Purpose**: Submit answer for current question

**Client Payload**:
```typescript
{
  code: string;       // Room code
  choiceIndex: number;  // 0-3
  timeTaken: number;    // Milliseconds
}
```

**Server Validation**:
- Participant must have `role: 'active'` AND `connectionStatus: 'connected'`
- Spectators cannot submit answers
- `gameState` must be 'active'
- Answer must be within time limit

**Server Behavior**:
1. Record answer in participant state
2. Calculate points (correct + time bonus)
3. Check if all **active + connected** participants submitted
4. If yes: Transition to results, broadcast `ROUND_END`
5. If no: Wait for others or timeout

**Server Response**:
```typescript
{
  success: true,
  correct: true,
  points: 850,  // Base + time bonus
  totalScore: 2150
}
```

**Broadcast** (when round ends):
```typescript
socket.to(roomCode).emit('ROUND_END', {
  correctAnswer: 1,  // Index of correct choice
  results: [
    {
      userId: 'user-1',
      username: 'Alice',
      correct: true,
      points: 850,
      totalScore: 2150,
      timeTaken: 3200
    },
    {
      userId: 'user-2',
      username: 'Bob',
      correct: false,
      points: 0,
      totalScore: 1200,
      timeTaken: 5100
    }
    // Only includes active, connected participants
  ],
  gameState: 'results',
  aiResponse: 'Great job, Alice! Bob, keep trying!'  // Uses feedbackMode
});
```

**Notes**:
- Disconnected participants excluded from round completion check
- Spectators never included in results
- AI feedback tone matches `room.feedbackMode`

---

### `NEXT_QUESTION`

**Direction**: Client → Server

**Purpose**: Progress to next question (host only)

**Client Payload**:
```typescript
{
  code: string;  // Room code
}
```

**Server Validation**:
- `gameState` must be 'results'
- Requester must be host

**Server Behavior**:
1. Increment question index
2. If more questions: Fetch next, broadcast `QUESTION_STARTED`
3. If no more questions: End game, broadcast `GAME_ENDED`
4. **NEW**: Promote spectators to active if slots available (<16 active)
5. Clear `room.voteState` (vote resets between questions)

**Server Response**:
```typescript
{
  success: true,
  hasMoreQuestions: true
}
```

**Broadcast** (next question):
```typescript
socket.to(roomCode).emit('QUESTION_STARTED', {
  question: { /* next question */ },
  currentQuestionIndex: 1,
  promotedParticipants: ['user-3']  // NEW: Spectators promoted to active
});
```

**Broadcast** (game end):
```typescript
socket.to(roomCode).emit('GAME_ENDED', {
  finalScores: [
    { userId: 'user-1', username: 'Alice', totalScore: 5200, rank: 1 },
    { userId: 'user-2', username: 'Bob', totalScore: 3800, rank: 2 }
  ],
  gameState: 'lobby',
  winner: {
    userId: 'user-1',
    username: 'Alice',
    totalScore: 5200
  }
});
```

---

### `VOTE_TO_END` (NEW)

**Direction**: Client → Server

**Purpose**: Cast vote to end game early

**Client Payload**:
```typescript
{
  code: string;  // Room code
}
```

**Server Validation**:
- `gameState` must be 'results' (not allowed during answering)
- Participant must have `role: 'active'` AND `connectionStatus: 'connected'`
- Spectators cannot vote

**Server Behavior**:
1. Initialize `room.voteState` if null:
   ```typescript
   voteState = {
     votedParticipantIds: new Set(),
     createdAt: Date.now(),
     threshold: Math.ceil(activeConnectedCount * 0.5)  // 50% of active+connected
   }
   ```
2. Add `participant.userId` to `voteState.votedParticipantIds`
3. Recalculate threshold dynamically (in case players disconnected)
4. If `voteState.votedParticipantIds.size >= voteState.threshold`:
   - End game immediately
   - Broadcast `GAME_ENDED`
5. Else: Broadcast `VOTE_UPDATED`

**Server Response**:
```typescript
{
  success: true,
  currentVotes: 3,
  requiredVotes: 5,
  gameEnded: false
}
```

**Broadcast** (vote update):
```typescript
socket.to(roomCode).emit('VOTE_UPDATED', {
  currentVotes: 3,
  requiredVotes: 5,  // Dynamically recalculated
  votedUserIds: ['user-1', 'user-2', 'user-3'],
  voteProgress: 0.6  // 3/5 = 60%
});
```

**Broadcast** (threshold met):
```typescript
socket.to(roomCode).emit('GAME_ENDED', {
  finalScores: [ /* ... */ ],
  gameState: 'lobby',
  endedBy: 'vote',  // Indicates vote-to-end triggered this
  voteState: {
    votedUserIds: ['user-1', 'user-2', 'user-3'],
    threshold: 3
  }
});
```

**Error Responses**:
```typescript
{ success: false, error: 'INVALID_STATE' }  // Not on results page
{ success: false, error: 'ALREADY_VOTED' }
{ success: false, error: 'SPECTATOR_CANNOT_VOTE' }
```

**Notes**:
- Vote threshold recalculates dynamically as players disconnect
- Vote state clears when returning to lobby or readying up
- Only available on results page (not during answering)
- 50% threshold means 4/7 players needed if one disconnects mid-vote

---

### `CANCEL_VOTE` (NEW)

**Direction**: Client → Server

**Purpose**: Remove own vote from vote-to-end

**Client Payload**:
```typescript
{
  code: string;  // Room code
}
```

**Server Behavior**:
- Remove `participant.userId` from `voteState.votedParticipantIds`
- If set becomes empty, clear `room.voteState`
- Broadcast `VOTE_UPDATED`

**Server Response**:
```typescript
{
  success: true,
  currentVotes: 2,
  requiredVotes: 5
}
```

**Broadcast**:
```typescript
socket.to(roomCode).emit('VOTE_UPDATED', {
  currentVotes: 2,
  requiredVotes: 5,
  votedUserIds: ['user-1', 'user-2'],
  voteProgress: 0.4
});
```

---

## State Synchronization Events

### `ROOM_STATE`

**Direction**: Server → Client (broadcast)

**Purpose**: Full room state sync (after joins, leaves, ready changes)

**Payload**:
```typescript
{
  code: 'ABC123',
  groupId: 'group-uuid',
  groupName: 'My Group',
  hostId: 'user-uuid',
  selectedCategory: 'Science',  // NEW
  feedbackMode: 'neutral',      // NEW
  maxActivePlayers: 16,         // NEW
  participants: [
    {
      userId: 'user-1',
      username: 'Alice',
      role: 'active',              // NEW
      connectionStatus: 'connected',  // NEW
      score: 1200,
      isReady: true,
      avatarUrl: 'https://...'
    },
    {
      userId: 'user-2',
      username: 'Bob',
      role: 'spectator',           // NEW
      connectionStatus: 'connected',
      score: 0,
      isReady: false,
      avatarUrl: 'https://...'
    }
  ],
  gameState: 'lobby',  // 'lobby' | 'active' | 'results'
  voteState: null,     // NEW: or VoteState object
  currentQuestion: null,
  currentQuestionIndex: 0,
  totalQuestions: 10,
  createdAt: 1699286400000
}
```

**Usage**: Clients should replace their entire local state with this payload

---

### `PARTICIPANT_JOINED`

**Direction**: Server → Client (broadcast)

**Purpose**: Notify of new participant

**Payload**: (See JOIN event broadcast above)

---

### `PARTICIPANT_LEFT`

**Direction**: Server → Client (broadcast)

**Purpose**: Notify of participant disconnection/departure

**Payload**: (See LEAVE_ROOM and disconnect broadcasts above)

---

### `RECONNECTED`

**Direction**: Server → Client (acknowledgment)

**Purpose**: Confirm successful reconnection

**Payload**:
```typescript
{
  success: true,
  reconnected: true,
  participant: { /* updated participant state */ },
  room: { /* full room state */ },
  message: 'Welcome back! You rejoined as a spectator for this round.'
}
```

---

## Error Events

### `ERROR`

**Direction**: Server → Client

**Purpose**: General error notification

**Payload**:
```typescript
{
  code: 'ROOM_NOT_FOUND',
  message: 'The room ABC123 does not exist or has expired',
  timestamp: Date.now()
}
```

**Common Error Codes**:
- `ROOM_NOT_FOUND`: Room doesn't exist
- `INVALID_STATE`: Action not allowed in current game state
- `NOT_HOST`: Action requires host permissions
- `INSUFFICIENT_PLAYERS`: Not enough players to start
- `INVALID_CATEGORY`: Category validation failed
- `SPECTATOR_CANNOT_VOTE`: Spectators can't vote
- `ALREADY_VOTED`: Duplicate vote attempt

---

## Client Implementation Examples

### Reconnection Flow (Authenticated)
```typescript
// Store participantId in localStorage for anonymous users
useEffect(() => {
  if (!userId && participantId) {
    localStorage.setItem('triviaParticipantId', participantId);
  }
}, [userId, participantId]);

// On reconnect
socket.emit('JOIN', {
  code: roomCode,
  participantId: localStorage.getItem('triviaParticipantId'),
  forceReconnect: true
}, (response) => {
  if (response.reconnected) {
    console.log('Reconnected successfully');
    if (response.participant.role === 'spectator') {
      showToast('Rejoined as spectator - you\'ll play next round!');
    }
  }
});
```

### Vote-to-End Flow
```typescript
// Only show vote button on results page
{gameState === 'results' && participant.role === 'active' && (
  <Button onClick={handleVote}>
    Vote to End ({currentVotes}/{requiredVotes})
  </Button>
)}

function handleVote() {
  socket.emit('VOTE_TO_END', { code: roomCode }, (response) => {
    if (response.gameEnded) {
      showToast('Game ended by vote!');
    }
  });
}

// Listen for vote updates
socket.on('VOTE_UPDATED', ({ currentVotes, requiredVotes }) => {
  setVoteState({ currentVotes, requiredVotes });
});
```

### Spectator Mode UI
```typescript
// Show spectator badge
{participant.role === 'spectator' && (
  <Badge variant="secondary">Spectator - Join next round</Badge>
)}

// Disable answer submission for spectators
<Button 
  disabled={participant.role === 'spectator'}
  onClick={handleSubmitAnswer}
>
  Submit Answer
</Button>
```

### Connection Status Indicators
```typescript
{participants.map(p => (
  <div key={p.userId}>
    <span>{p.username}</span>
    {p.connectionStatus === 'disconnected' && (
      <Badge variant="outline">Disconnected</Badge>
    )}
    {p.role === 'spectator' && (
      <Badge variant="secondary">Spectator</Badge>
    )}
  </div>
))}
```

---

## State Transition Summary

### Game State Flow
```
lobby → active → results → (next question or lobby)
         ↑                         ↓
         └─────────(vote-to-end)───┘
```

### Participant Role Flow
```
New Join (lobby, <16 active) → active
New Join (lobby, >=16 active) → spectator
New Join (active game) → spectator
Reconnect (mid-round) → spectator (even if was active)
Spectator (game returns to lobby) → active (if <16 active)
```

### Vote State Flow
```
null → (first vote on results) → VoteState
VoteState → (return to lobby) → null
VoteState → (ready up) → null
VoteState → (threshold met) → game ends → null
```

---

## Performance Considerations

- **Room State Broadcasts**: Debounce rapid changes (e.g., multiple disconnects)
- **Vote Threshold**: Calculate once per vote, not per broadcast
- **Reconnection**: Use `socket.join(roomCode)` to rejoin namespace efficiently
- **Category Filtering**: Cache question pool per room to avoid repeated DB queries

## Security Notes

- Validate `participantId` matches existing participant (no spoofing)
- Host-only actions must check `req.userId === room.hostId`
- Rate limit vote casting (1 vote per 2 seconds per participant)
- Sanitize all usernames and text content before broadcasting

## Backwards Compatibility

- `roastMode: true` maps to `feedbackMode: 'roast'` in CREATE_ROOM
- Clients not sending `participantId` on JOIN still work (authenticated only)
- Old clients without `role` field see all participants as active (degraded UX)

## Summary

**New Events**: `VOTE_TO_END`, `CANCEL_VOTE`, `RECONNECTED`  
**Modified Events**: `JOIN` (reconnection + spectator), `CREATE_ROOM` (category + feedback), `PLAYER_READY` (clears vote)  
**New Broadcasts**: `VOTE_UPDATED`, `PARTICIPANT_LEFT` (with connectionStatus)  
**Breaking Changes**: None (all additive)
