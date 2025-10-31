# Quickstart Guide: Trivia Room System

**Feature**: 001-trivia-room-system  
**Date**: 2025-10-30

## Purpose

This guide helps developers get the Trivia Room System running locally and understand the key workflows.

---

## Prerequisites

- **Node.js**: v20+ 
- **npm**: v10+
- **Cloudflare Account**: Free tier sufficient
- **Wrangler CLI**: `npm install -g wrangler`

---

## Initial Setup

### 1. Install Dependencies

```bash
# From project root
npm install
```

Expected dependencies:
- `next@16.0.1`
- `react@19.2.0`
- `tailwindcss@4`
- `typescript@5`

### 2. Configure Cloudflare Workers

```bash
# Login to Cloudflare
wrangler login

# Initialize Durable Objects (if not done)
cd workers/
wrangler init
```

Create `wrangler.toml`:
```toml
name = "trivia-room-workers"
main = "room-durable-object.ts"
compatibility_date = "2025-10-30"

[[durable_objects.bindings]]
name = "ROOMS"
class_name = "RoomDurableObject"
script_name = "trivia-room-workers"

[[migrations]]
tag = "v1"
new_classes = ["RoomDurableObject"]
```

### 3. Environment Variables

Create `.env.local` in project root:
```bash
# WebSocket endpoint (Cloudflare Workers URL)
NEXT_PUBLIC_WS_URL=ws://localhost:8787

# API base URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 4. Start Development Servers

**Terminal 1 - Cloudflare Workers (Durable Objects)**:
```bash
cd workers/
wrangler dev --local --port 8787
```

**Terminal 2 - Next.js App**:
```bash
npm run dev
```

App runs at: `http://localhost:3000`

---

## Key Workflows

### Workflow 1: Create and Join Room

**User A creates room**:
1. Navigate to `http://localhost:3000`
2. Enter name: "Alice"
3. Click "Create Room"
4. See room code: "A3B7K9"
5. Share code with friends

**User B joins room**:
1. Navigate to `http://localhost:3000`
2. Enter name: "Bob"
3. Enter room code: "A3B7K9"
4. Click "Join Room"
5. See Alice in participant list

**What's happening**:
```
Browser → POST /api/room/create
        ← { roomCode: "A3B7K9", playerId: "p1", websocketUrl: "..." }

Browser → WebSocket connect to wss://...
        ← ROOM_STATE message (initial state)

Browser → JOIN message with playerId
        ← ROOM_STATE updated
```

**Files involved**:
- `app/page.tsx` - Home page with create/join forms
- `app/components/create-room-form.tsx` - Create room UI
- `app/components/join-room-form.tsx` - Join room UI
- `app/api/room/create/route.ts` - HTTP endpoint
- `workers/room-durable-object.ts` - Durable Object handling

---

### Workflow 2: Start Game

**All players ready up**:
1. Each player clicks "Ready" button
2. When all ready, game auto-starts (3 second countdown)
3. First question appears with 3-minute timer

**What's happening**:
```
Browser A → READY message { isReady: true }
          ← PLAYER_READY broadcast to all

Browser B → READY message { isReady: true }
          ← PLAYER_READY broadcast to all
          ← GAME_START broadcast { question: {...}, startTime: ..., duration: 180000 }
```

**Server logic**:
- Check if all participants `isReady === true`
- If yes, select random question from unused questions
- Create new round with `startTime = Date.now()`
- Broadcast `GAME_START` to all clients
- Start 3-minute server-side timer

**Files involved**:
- `app/components/room-lobby.tsx` - Participant list with ready buttons
- `app/components/game-question.tsx` - Question display
- `workers/room-durable-object.ts` - Game start logic
- `app/lib/questions.ts` - Hardcoded 10 questions

---

### Workflow 3: Answer Question

**Players answer**:
1. Player types answer into text input
2. Clicks "Submit Answer"
3. Sees "Waiting for others..." state
4. Can see "2/3 answered" progress

**What's happening**:
```
Browser → ANSWER message { answerText: "Paris", timestamp: 5420 }
        ← ANSWER_SUBMITTED confirmation
        ← ANSWER_COUNT_UPDATE { answeredCount: 2, totalCount: 3 }
```

**Server logic**:
- Validate answer (game is active, player hasn't answered yet)
- Record answer text with timestamp
- Check if all players answered OR timer expired
- If round complete, normalize answers and calculate winner
- Broadcast `ROUND_END`

**Answer Normalization**:
- Convert to lowercase
- Trim whitespace
- Compare against `acceptedAnswers` array
- Example: "paris", " Paris ", "PARIS" all match "Paris"

**Files involved**:
- `app/components/game-question.tsx` - Text input UI
- `app/lib/websocket.ts` - WebSocket message sending
- `workers/room-durable-object.ts` - Answer validation and round end

---

### Workflow 4: View Results and Continue

**After round ends**:
1. All players see results screen
2. Correct answer and accepted variations shown
3. Winner announced
4. Each player's answer (text) and time shown
5. Players click "Ready for Next Round"
6. New question appears

**What's happening**:
```
All answered OR timer expired
→ Server calculates winner (fastest correct answer)
← ROUND_END broadcast { correctAnswer: "Paris", acceptedAnswers: ["Paris"], winnerId: "p1", results: [...] }
← ROOM_STATE { gameState: "results", ... }

Players ready up again
→ READY messages
← GAME_START (new question, not previously used)
```

**Files involved**:
- `app/components/round-results.tsx` - Results display
- `app/lib/room-state.ts` - Winner calculation
- `workers/room-durable-object.ts` - Question selection (avoid repeats)

---

## Manual Testing Checklist

### Basic Functionality

- [ ] **Create Room**: Can create room and receive unique code
- [ ] **Join Room**: Can join existing room with code
- [ ] **Invalid Code**: Cannot join non-existent room (shows error)
- [ ] **Duplicate Name**: Cannot join with name already in room
- [ ] **Room Full**: Cannot join room with 8 players
- [ ] **Participant List**: See all players in real-time
- [ ] **Ready Toggle**: Can ready/unready in lobby
- [ ] **Game Start**: Game starts when all players ready
- [ ] **Question Display**: See question text and text input field
- [ ] **Answer Input**: Can type answer into text field
- [ ] **Answer Submit**: Can submit answer once
- [ ] **Cannot Re-answer**: Cannot change answer after submit
- [ ] **Timer Display**: Countdown shows 3:00 → 0:00
- [ ] **Timer Expiry**: Round ends when timer reaches 0:00
- [ ] **All Answered**: Round ends immediately when all answer
- [ ] **Correct Answer**: Results show correct answer and accepted variations
- [ ] **Answer Normalization**: "paris", " Paris ", "PARIS" all marked correct
- [ ] **Winner Display**: Winner shown (fastest correct) or "No Winner"
- [ ] **Player Stats**: Each player's typed answer and time shown
- [ ] **Next Round**: Can ready up for next question
- [ ] **No Repeat**: New question different from previous
- [ ] **Leave Room**: Can leave at any time
- [ ] **Room Cleanup**: Room deleted when all players leave

### Responsive Design

- [ ] **Mobile (320px)**: All UI usable on small screens
- [ ] **Tablet (768px)**: Layout adapts appropriately
- [ ] **Desktop (1024px+)**: Full layout with optimal spacing
- [ ] **Touch Targets**: Buttons at least 44x44px on mobile
- [ ] **Font Scaling**: Text readable on all screen sizes

### Real-time Synchronization

- [ ] **Join Updates**: New player appears immediately for all
- [ ] **Ready Updates**: Ready status updates within 2 seconds
- [ ] **Question Sync**: All players see question within 1 second
- [ ] **Answer Progress**: Answer count updates in real-time
- [ ] **Results Sync**: All see results simultaneously
- [ ] **Leave Updates**: Player removal shows immediately

### Edge Cases

- [ ] **Disconnection**: Shows reconnecting state, attempts reconnect
- [ ] **Reconnect Success**: Player rejoins with same state
- [ ] **Reconnect Fail**: Shows error after 5 attempts
- [ ] **Room Creator Leaves**: Room continues for other players
- [ ] **Last Player Leaves**: Room is deleted
- [ ] **Browser Refresh**: (Expected: Lose connection, need to rejoin)
- [ ] **Multiple Tabs**: Cannot join same room twice with same name

---

## Testing with Multiple Clients

### Option 1: Multiple Browser Windows

```bash
# Open multiple windows
open -n -a "Google Chrome" --args --user-data-dir=/tmp/chrome1 http://localhost:3000
open -n -a "Google Chrome" --args --user-data-dir=/tmp/chrome2 http://localhost:3000
```

### Option 2: Different Browsers

- Chrome: Player 1
- Firefox: Player 2
- Safari: Player 3

### Option 3: Browser + Mobile Device

1. Start dev server: `npm run dev -- --hostname 0.0.0.0`
2. Get local IP: `ifconfig | grep inet`
3. Mobile browser: `http://<YOUR_IP>:3000`

---

## Debugging

### Check WebSocket Connection

**Browser DevTools → Network → WS tab**:
- Should see connection to `ws://localhost:8787`
- Should see JSON messages flowing

### Check Console Logs

**Browser Console**:
```javascript
// Connection status
console.log(ws.readyState); // 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED

// Inspect room state
console.log(roomState);
```

**Server Logs (Wrangler)**:
```bash
# Terminal running wrangler dev
# Shows incoming messages and state changes
```

### Common Issues

**"Cannot connect to WebSocket"**:
- Check Wrangler dev server is running
- Verify `NEXT_PUBLIC_WS_URL` in `.env.local`
- Check browser console for connection errors

**"Room not found"**:
- Ensure Durable Object is properly initialized
- Check room code is correct (6 characters, uppercase)
- Verify Wrangler dev is running

**"Players not syncing"**:
- Check WebSocket messages in Network tab
- Verify all clients connected to same room
- Check server logs for broadcast confirmations

---

## Performance Validation

### Success Criteria Checks

| Criterion | How to Validate |
|-----------|-----------------|
| SC-001: Create room <30s | Time from click to seeing code |
| SC-002: Join room <20s | Time from entering code to seeing lobby |
| SC-003: Real-time updates <2s | Use stopwatch, measure join/ready updates |
| SC-004: Game starts <3s | Time from last ready to question appearing |
| SC-005: Question sync <1s | Compare timestamps across devices |
| SC-006: Timer drift <2s | Compare timers on 2 devices after 3 minutes |
| SC-009: Responsive 320-2560px | Test all breakpoints in DevTools |
| SC-014: Page load <3s | Network tab, measure initial load time |

---

## Next Steps

After validating this workflow:

1. ✅ Basic create/join working
2. ✅ Real-time ready status updates
3. ✅ Game start with question display
4. ✅ Answer submission and results
5. ✅ Multi-round gameplay
6. → Proceed to full implementation (see tasks.md)

---

## Quick Reference

### Important URLs

- **Home**: `http://localhost:3000`
- **Room**: `http://localhost:3000/room/{code}`
- **WebSocket**: `ws://localhost:8787/room/{code}`

### Key Files

- `app/page.tsx` - Home page
- `app/room/[code]/page.tsx` - Room page
- `app/lib/websocket.ts` - WebSocket client
- `workers/room-durable-object.ts` - Server logic
- `app/lib/questions.ts` - 10 hardcoded questions

### Commands

```bash
# Start everything
npm run dev                    # Terminal 1: Next.js
cd workers && wrangler dev     # Terminal 2: Durable Objects

# Deploy to production
npm run build && npm run start  # Next.js
cd workers && wrangler publish  # Cloudflare Workers
```

---

**Ready for**: Implementation (see tasks.md, generated by `/speckit.tasks` command)
