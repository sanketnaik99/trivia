# Developer Quickstart: Game Stability Improvements

**Feature**: 004-game-stability-improvements  
**Branch**: `004-game-stability-improvements`  
**Complexity**: Medium (existing Socket.IO patterns, additive changes)

## Overview

This feature adds game stability (reconnection, disconnect handling) and customization (categories, feedback modes, voting, spectator mode). All changes are backwards compatible and use existing stack (Socket.IO, Prisma, React).

## Prerequisites

- Node.js 18+
- PostgreSQL database running
- Turborepo monorepo setup complete
- Familiarity with Socket.IO events and Prisma ORM

## Setup

### 1. Clone and Branch

```bash
cd /Users/sanketnaik99/Coding/React/trivia
git checkout -b 004-game-stability-improvements
```

### 2. Database Migration (if needed)

Check if `Question` model has `category` field:

```bash
cd apps/backend
npx prisma studio
# Inspect Question model in browser
```

If `category` field missing, add to schema:

```prisma
// apps/backend/prisma/schema.prisma
model Question {
  id          String   @id @default(cuid())
  text        String
  choices     String[] // Array of 4 choices
  correctIndex Int     // 0-3
  category    String   @default("General")  // NEW
  difficulty  String?
  createdAt   DateTime @default(now())
  
  @@index([category])  // NEW: For filtering
}
```

Then migrate:

```bash
npx prisma migrate dev --name add_question_category
```

### 3. Install Dependencies (if any new ones added)

```bash
# From root
npm install
```

No new dependencies expected - feature uses existing stack.

### 4. Start Development Servers

```bash
# Terminal 1: Backend
cd apps/backend
npm run dev  # Runs on http://localhost:4000

# Terminal 2: Frontend  
cd apps/frontend
npm run dev  # Runs on http://localhost:3000
```

## Key Files to Modify

### Backend

**Type Definitions**:
- `apps/backend/src/types/room.types.ts` - Add `ParticipantRole`, update `Participant`, `Room` interfaces
- `apps/backend/src/types/game.types.ts` - Add `VoteState`, `FeedbackMode` types

**Services**:
- `apps/backend/src/services/room.service.ts`
  - Add category validation in `createRoom()`
  - Implement spectator role assignment in join logic
  - Add vote state management
  
- `apps/backend/src/services/game.service.ts`
  - Modify `checkRoundCompletion()` to exclude disconnected players
  - Add `promoteSpectators()` helper
  - Implement vote threshold calculation
  
- `apps/backend/src/services/question.service.ts`
  - Add `getQuestionsByCategory()` method
  - Add `getCategoriesWithCount()` method

**Socket Handlers**:
- `apps/backend/src/socket/room.handler.ts`
  - Enhance `JOIN` handler for reconnection detection
  - Add `participantId` localStorage handling
  - Implement spectator role logic
  
- `apps/backend/src/socket/game.handler.ts`
  - Add `VOTE_TO_END` handler
  - Add `CANCEL_VOTE` handler
  - Modify `PLAYER_READY` to clear vote state
  - Update `SUBMIT_ANSWER` to check active role

**Routes** (new):
- `apps/backend/src/routes/question.routes.ts` - GET /api/questions/categories endpoint

**Store**:
- `apps/backend/src/store/room.store.ts` - Add new Room fields (voteState, selectedCategory, feedbackMode, cleanupTimer, maxActivePlayers)

### Frontend

**Components** (new):
- `apps/frontend/app/room/[code]/components/SpectatorBadge.tsx`
- `apps/frontend/app/room/[code]/components/ConnectionStatus.tsx`
- `apps/frontend/app/room/[code]/components/VoteToEndButton.tsx`
- `apps/frontend/app/groups/[id]/components/CategorySelect.tsx`
- `apps/frontend/app/groups/[id]/components/FeedbackModeSelect.tsx`

**Pages** (modify):
- `apps/frontend/app/room/[code]/page.tsx`
  - Add spectator mode UI
  - Add vote-to-end controls
  - Handle reconnection flow
  - Show connection status indicators
  
- `apps/frontend/app/groups/[id]/page.tsx`
  - Add category selector to room creation form
  - Add feedback mode selector

**Hooks** (modify):
- `apps/frontend/app/room/[code]/hooks/useSocket.ts`
  - Listen for new events (VOTE_UPDATED, RECONNECTED, PARTICIPANT_LEFT)
  - Handle participantId localStorage
  - Implement reconnection logic

**Types**:
- `apps/frontend/types/room.ts` - Mirror backend type changes

## Development Workflow

### Phase 1: Backend Types & Store

1. Update `room.types.ts` with new interfaces:
   ```typescript
   export type ParticipantRole = 'active' | 'spectator';
   export type FeedbackMode = 'supportive' | 'neutral' | 'roast';
   
   export interface Participant {
     // ... existing fields
     role: ParticipantRole;
     connectionStatus: 'connected' | 'disconnected';
   }
   
   export interface VoteState {
     votedParticipantIds: Set<string>;
     createdAt: number;
     threshold: number;
   }
   
   export interface Room {
     // ... existing fields
     selectedCategory: string | null;
     feedbackMode: FeedbackMode;
     voteState: VoteState | null;
     cleanupTimer: NodeJS.Timeout | null;
     maxActivePlayers: number;
   }
   ```

2. Update `room.store.ts` to initialize new fields

3. Run TypeScript check:
   ```bash
   cd apps/backend
   npm run type-check
   ```

### Phase 2: Service Layer

1. **Question Service**:
   ```bash
   # Test category fetching
   curl http://localhost:4000/api/questions/categories
   ```

2. **Room Service**:
   - Add category validation to `createRoom()`
   - Test with Postman/curl

3. **Game Service**:
   - Implement vote threshold calculation
   - Test with unit tests (if added)

### Phase 3: Socket Handlers

1. **JOIN Handler** (most complex):
   - Test reconnection with authenticated user
   - Test reconnection with anonymous user + participantId
   - Test spectator assignment (mid-game join, 16+ players)
   
   ```typescript
   // Test in browser console
   socket.emit('JOIN', { 
     code: 'ABC123', 
     participantId: localStorage.getItem('triviaParticipantId') 
   }, console.log);
   ```

2. **VOTE_TO_END Handler**:
   - Test vote counting
   - Test threshold met → game ends
   - Test vote clearing on ready-up

3. **disconnect Handler**:
   - Simulate disconnect (close browser tab)
   - Verify game continues for others
   - Verify cleanup timer starts if room empty

### Phase 4: Frontend Components

1. **CategorySelect** (group page):
   ```typescript
   // Fetch categories on mount
   useEffect(() => {
     fetch('http://localhost:4000/api/questions/categories')
       .then(r => r.json())
       .then(data => setCategories(data.categories));
   }, []);
   ```

2. **SpectatorBadge** (room page):
   - Show when `participant.role === 'spectator'`
   - Display "Join next round" message

3. **VoteToEndButton** (room page):
   - Only render when `gameState === 'results'` AND `role === 'active'`
   - Show vote progress (`currentVotes / requiredVotes`)

4. **ConnectionStatus**:
   - Show badges for disconnected players
   - Update on `PARTICIPANT_LEFT` event

### Phase 5: Reconnection Flow

1. **localStorage Management**:
   ```typescript
   // Save participantId on first join
   useEffect(() => {
     if (participantId && !userId) {
       localStorage.setItem('triviaParticipantId', participantId);
     }
   }, [participantId, userId]);
   ```

2. **Reconnect Detection**:
   ```typescript
   // On mount, attempt reconnect
   useEffect(() => {
     const storedId = localStorage.getItem('triviaParticipantId');
     socket.emit('JOIN', { code, participantId: storedId }, (response) => {
       if (response.reconnected) {
         toast.success('Reconnected!');
       }
     });
   }, []);
   ```

3. **Test Scenarios**:
   - Refresh page during lobby → should maintain active role
   - Refresh during active round → should become spectator
   - Close tab and rejoin → should reconnect with same data

## Testing Checklist

### Reconnection
- [ ] Authenticated user refreshes → maintains participant data
- [ ] Anonymous user refreshes → localStorage reconnection works
- [ ] Refresh during lobby → keeps active role
- [ ] Refresh mid-round → becomes spectator
- [ ] Refresh on results page → reconnects as spectator (if mid-round)
- [ ] Score and username preserved after reconnection

### Disconnection Handling
- [ ] One player closes tab → others continue playing
- [ ] Disconnected player's connectionStatus shows 'disconnected'
- [ ] Round completes without waiting for disconnected player
- [ ] Empty room starts 5-minute cleanup timer
- [ ] Reconnection cancels cleanup timer

### Spectator Mode
- [ ] 17th player joins → becomes spectator
- [ ] Spectator cannot submit answers
- [ ] Spectator cannot vote
- [ ] Spectator cannot ready up
- [ ] Spectator badge shows in UI
- [ ] Spectator promoted to active when game returns to lobby (if <16 active)
- [ ] Mid-game join → becomes spectator regardless of count

### Vote-to-End
- [ ] Vote button only shows on results page
- [ ] Vote button disabled during answering
- [ ] Vote progress displays correctly
- [ ] 50% threshold calculation accurate
- [ ] Threshold recalculates when player disconnects
- [ ] Vote clears when readying up
- [ ] Vote clears when game ends
- [ ] Game ends immediately when threshold met

### Categories
- [ ] Category dropdown shows on group room creation
- [ ] Only categories with >=10 questions appear
- [ ] Selected category filters questions correctly
- [ ] "All Categories" option works (null category)
- [ ] Invalid category returns error

### Feedback Modes
- [ ] Feedback mode selector shows three options
- [ ] Default is 'neutral'
- [ ] AI responses match selected mode tone
- [ ] Supportive mode: encouraging
- [ ] Neutral mode: factual
- [ ] Roast mode: humorous/teasing
- [ ] Backwards compatible with roastMode boolean

### Player Capacity
- [ ] Lobby displays "9/16 players"
- [ ] 16th player joins as active
- [ ] 17th player joins as spectator
- [ ] Spectators don't count toward ready check

## Manual Testing Flow

### Scenario 1: Page Refresh Recovery
1. Create room, join with 2+ players
2. Start game, answer 1 question
3. **During active round**, refresh page
4. **Expected**: Rejoins as spectator, can watch current round
5. **After round ends**, return to lobby → promoted to active

### Scenario 2: Vote-to-End
1. Create room with 4 players
2. Start game, complete 2 questions
3. On results page, 2 players click "Vote to End"
4. **Expected**: Vote shows "2/2" (50% of 4 = 2)
5. Game ends immediately, returns to lobby
6. Vote state cleared

### Scenario 3: Mid-Game Disconnect
1. Start game with 3 players (Alice, Bob, Charlie)
2. Bob closes browser tab (disconnect)
3. **Expected**: Alice and Charlie continue playing
4. Round completes with only Alice and Charlie's answers
5. Results show Alice and Charlie, Bob marked disconnected
6. Bob rejoins → becomes spectator

### Scenario 4: Category Selection
1. Go to group page
2. Click "Create Room"
3. Select category: "Science"
4. Select feedback mode: "Supportive"
5. **Expected**: All questions are Science category
6. AI feedback is encouraging

## Debugging Tips

### Socket.IO Events
```typescript
// Enable debug logging (backend)
DEBUG=socket.io:* npm run dev

// Browser console (frontend)
socket.onAny((event, ...args) => {
  console.log(`[Socket] ${event}`, args);
});
```

### Reconnection Issues
```typescript
// Check localStorage
console.log(localStorage.getItem('triviaParticipantId'));

// Check server-side participant matching
console.log('Participants in room:', room.participants.map(p => ({
  userId: p.userId,
  participantId: p.participantId,
  connectionStatus: p.connectionStatus
})));
```

### Vote Threshold
```typescript
// Log vote calculations
const activeConnected = participants.filter(p => 
  p.role === 'active' && p.connectionStatus === 'connected'
).length;
const threshold = Math.ceil(activeConnected * 0.5);
console.log({ activeConnected, threshold, currentVotes: voteState.votedParticipantIds.size });
```

## Performance Monitoring

- **Room Cleanup**: Check no memory leaks from uncancelled timers
- **Vote State**: Set size should match participant count
- **Reconnection**: Should be <500ms for userId lookup
- **Category Queries**: Cache results for 5 minutes

## Common Pitfalls

1. **Forgetting to clear vote state**: Always clear on ready-up and lobby return
2. **Not recalculating threshold**: Must update when players disconnect mid-vote
3. **Spectator permissions**: Check role in all action handlers
4. **localStorage timing**: Save participantId immediately on join response
5. **Disconnect vs Leave**: Use different connectionStatus values

## Next Steps

After completing development:

1. Test all scenarios in checklist
2. Update `.github/copilot-instructions.md` (run update script)
3. Document any edge cases discovered
4. Get PR review focusing on Socket.IO event handling
5. Deploy to staging for QA testing

## Resources

- **Spec**: `/specs/004-game-stability-improvements/spec.md`
- **Data Model**: `/specs/004-game-stability-improvements/data-model.md`
- **API Contracts**: `/specs/004-game-stability-improvements/contracts/`
- **Socket.IO Docs**: https://socket.io/docs/v4/
- **Prisma Docs**: https://www.prisma.io/docs/

## Questions?

Refer to `research.md` for technical decisions and patterns. All unknowns were resolved during planning phase.
