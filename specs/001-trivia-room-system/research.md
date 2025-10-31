# Research: Trivia Room System

**Feature**: 001-trivia-room-system  
**Date**: 2025-10-30  
**Status**: Complete

## Research Tasks

This document resolves all NEEDS CLARIFICATION items from the Technical Context and provides best practices for the chosen technology stack.

---

## 1. WebSocket Client Library Choice

**Question**: Which WebSocket client library should be used - ws, socket.io-client, or native WebSocket API?

**Decision**: Native WebSocket API

**Rationale**:
- **Minimal Dependencies**: Aligns with constitution principle IV (Minimal Dependencies)
- **Browser Native**: No additional bundle size, works in all modern browsers
- **Cloudflare Durable Objects Compatibility**: Cloudflare Workers support native WebSocket protocol
- **Simplicity**: Direct protocol control without abstraction overhead
- **TypeScript Support**: Built-in TypeScript types available

**Alternatives Considered**:
- **socket.io-client**: 
  - ❌ Adds ~52KB to bundle
  - ❌ Requires socket.io server (not compatible with Durable Objects WebSocket)
  - ✅ Auto-reconnection and fallbacks
  - **Rejected**: Violates minimal dependencies, incompatible with Cloudflare Workers
  
- **ws library**: 
  - ❌ Node.js only (server-side)
  - ❌ Not for browser use
  - **Rejected**: Wrong environment
  
- **Native WebSocket API**:
  - ✅ Zero dependencies
  - ✅ Universal browser support
  - ✅ Direct Cloudflare Durable Objects integration
  - ✅ ~0KB bundle impact
  - ❌ Manual reconnection logic needed
  - **Selected**: Best fit for constitution and technical requirements

**Implementation Notes**:
- Use `new WebSocket(url)` directly in client code
- Implement reconnection logic with exponential backoff
- Handle connection states: CONNECTING, OPEN, CLOSING, CLOSED
- Use JSON for message serialization (standard approach)

---

## 2. Cloudflare Durable Objects Integration

**Question**: How to integrate Cloudflare Durable Objects with Next.js?

**Decision**: Hybrid architecture - Next.js frontend + Cloudflare Workers backend

**Rationale**:
- **Separation of Concerns**: Next.js handles UI/routing, Cloudflare Workers handle real-time state
- **Deployment Strategy**: Deploy Next.js to Vercel/self-host, deploy Workers to Cloudflare
- **WebSocket Support**: Cloudflare Workers with Durable Objects provide native WebSocket handling
- **State Management**: Each room is a separate Durable Object instance (automatic isolation)

**Architecture**:
```
Client (Browser)
    ↓ HTTP
Next.js App (Vercel/Self-host)
    ↓ WebSocket
Cloudflare Worker
    ↓ 
Durable Object (Room State)
```

**Deployment Approach**:
1. **Next.js App**: Standard Next.js deployment (Vercel, self-host, etc.)
2. **Cloudflare Workers**: Separate deployment using Wrangler CLI
3. **Connection Flow**: 
   - Client connects to Next.js for initial page load
   - Client establishes WebSocket to Cloudflare Workers endpoint
   - Worker routes WebSocket to appropriate Durable Object by room code

**Alternatives Considered**:
- **Next.js API Routes for WebSocket**: 
  - ❌ Next.js API routes don't support WebSocket upgrades well
  - ❌ Stateless by design (not suitable for persistent connections)
  - **Rejected**: Technical limitation
  
- **Separate Node.js WebSocket Server**:
  - ✅ Full control over WebSocket implementation
  - ❌ Requires additional infrastructure (hosting, scaling)
  - ❌ More complex state synchronization
  - **Rejected**: Adds operational complexity

- **Cloudflare Workers + Durable Objects**:
  - ✅ Built-in WebSocket support
  - ✅ Automatic state persistence
  - ✅ Geographic distribution (low latency)
  - ✅ Scales automatically per room
  - ❌ Cloudflare-specific platform
  - **Selected**: Best fit for real-time state requirements

**Implementation Notes**:
- Use Wrangler for Cloudflare Workers development and deployment
- Each room code maps to a unique Durable Object ID
- Durable Objects handle WebSocket connections and broadcast state changes
- Environment variable for Cloudflare Workers WebSocket endpoint URL

---

## 3. Concurrent Room Scaling

**Question**: How many concurrent rooms should the system support? 10? 100? 1000?

**Decision**: Start with 100 concurrent rooms, design for 1000+

**Rationale**:
- **MVP Focus**: 100 rooms sufficient for initial testing and validation
- **Durable Objects Architecture**: Naturally scales to thousands (each room is isolated)
- **Cost Considerations**: Cloudflare pricing scales with usage
- **No Hard Limit**: Architecture doesn't impose technical ceiling

**Scaling Strategy**:
- **Per-Room Isolation**: Each Durable Object instance handles one room (6-8 players)
- **Geographic Distribution**: Cloudflare distributes Durable Objects globally
- **Automatic Scaling**: Cloudflare handles infrastructure scaling
- **Performance Target**: <2s latency for room operations regardless of room count

**Monitoring Approach** (for future):
- Track active room count
- Monitor Durable Object creation rate
- Measure WebSocket connection counts
- Alert if approaching Cloudflare plan limits

**Alternatives Considered**:
- **Hard Limit (10 rooms)**:
  - ✅ Simplest to implement
  - ❌ Too restrictive for real-world use
  - **Rejected**: Insufficient for MVP testing
  
- **Hard Limit (100 rooms)**:
  - ✅ Adequate for MVP
  - ✅ Provides realistic testing conditions
  - ❌ May need adjustment based on usage
  - **Accepted as MVP target**
  
- **Unlimited**:
  - ✅ Best user experience
  - ❌ Need monitoring and cost controls
  - **Accepted as design goal**

**Implementation Notes**:
- No hard-coded room limit in code
- Implement soft monitoring (log warnings at 100+ rooms)
- Room cleanup: Delete Durable Object state when all players leave
- Room expiration: Consider TTL (e.g., 24 hours of inactivity)

---

## 4. Best Practices: Next.js + WebSocket Real-time Apps

**Research Focus**: Patterns for integrating WebSocket real-time features with Next.js

**Key Findings**:

### Client-Side WebSocket Management
```typescript
// Use React hooks for WebSocket lifecycle
useEffect(() => {
  const ws = new WebSocket(WS_URL);
  
  ws.onopen = () => setConnectionStatus('connected');
  ws.onmessage = (event) => handleMessage(JSON.parse(event.data));
  ws.onerror = (error) => handleError(error);
  ws.onclose = () => attemptReconnect();
  
  return () => ws.close(); // Cleanup on unmount
}, [roomCode]);
```

**Best Practices**:
- ✅ Create WebSocket connection in `useEffect` hook
- ✅ Store WebSocket instance in `useRef` for stable reference
- ✅ Implement reconnection logic with exponential backoff
- ✅ Handle connection state in React state for UI feedback
- ✅ Clean up WebSocket on component unmount
- ✅ Use Context API to share WebSocket across components

### State Synchronization Patterns
- **Server as Source of Truth**: All state mutations happen on server
- **Optimistic Updates**: Show immediate feedback, rollback on error
- **Broadcast Pattern**: Server broadcasts state changes to all connected clients
- **Message Types**: Use typed messages (`JOIN`, `READY`, `ANSWER`, `START_GAME`, etc.)

### Error Handling
- ✅ Network disconnection: Show "Reconnecting..." UI
- ✅ Invalid messages: Log and ignore (don't crash)
- ✅ Connection timeout: Attempt reconnect after 5 seconds
- ✅ Max reconnect attempts: 5 attempts, then show error

### Performance Optimization
- ✅ Debounce rapid state changes (e.g., timer updates every second, not every ms)
- ✅ Use React.memo for components that receive frequent updates
- ✅ Minimize JSON payload size (send only changed data)
- ✅ Batch multiple state updates into single message when possible

---

## 5. Best Practices: Cloudflare Durable Objects for Game State

**Research Focus**: Patterns for using Durable Objects as game room state managers

**Key Findings**:

### Durable Objects Architecture
```typescript
export class RoomDurableObject {
  state: DurableObjectState;
  sessions: WebSocket[]; // Connected players
  roomState: {
    code: string;
    participants: Participant[];
    gameState: 'lobby' | 'active' | 'results';
    currentQuestion?: Question;
    // ...
  };

  async fetch(request: Request) {
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }
    // Handle HTTP requests
    return new Response('OK');
  }
}
```

**Best Practices**:
- ✅ Store WebSocket connections in memory array
- ✅ Use `state.storage` for persistent data (survives restarts)
- ✅ Broadcast to all sessions when state changes
- ✅ Handle session cleanup when WebSocket closes
- ✅ Validate all incoming messages (player authentication, action validity)

### State Persistence Strategy
- **In-Memory**: Active game state (fast access, lost on restart)
- **Persistent Storage**: Room metadata, player list (survives restarts)
- **Hybrid Approach**: Keep active state in memory, periodically snapshot to storage

### Message Protocol Design
```typescript
// Client → Server
type ClientMessage = 
  | { type: 'JOIN', playerName: string }
  | { type: 'READY' }
  | { type: 'ANSWER', answerId: string, timestamp: number };

// Server → Client  
type ServerMessage =
  | { type: 'ROOM_STATE', state: RoomState }
  | { type: 'PLAYER_JOINED', player: Participant }
  | { type: 'GAME_START', question: Question }
  | { type: 'ROUND_END', results: RoundResults };
```

**Best Practices**:
- ✅ Use discriminated unions for type safety
- ✅ Version messages (support protocol evolution)
- ✅ Include timestamps for ordering
- ✅ Validate message structure before processing

### Concurrency & Race Conditions
- **Problem**: Multiple players acting simultaneously
- **Solution**: Sequential message processing (Durable Objects are single-threaded)
- **Benefit**: No race conditions, no locks needed
- **Pattern**: Queue incoming messages, process in order

---

## 6. Best Practices: Responsive Design for Real-time Games

**Research Focus**: Tailwind patterns for responsive game UI

**Key Findings**:

### Mobile-First Breakpoints
```typescript
// Tailwind breakpoints
sm: 640px   // Small tablets
md: 768px   // Tablets
lg: 1024px  // Desktop
xl: 1280px  // Large desktop
```

**Layout Strategy**:
- **Mobile (320-767px)**: Single column, stacked UI, large touch targets
- **Tablet (768-1023px)**: Consider 2-column where space allows
- **Desktop (1024px+)**: Multi-column, sidebar layouts, more information density

### Component Patterns
```tsx
// Room lobby - responsive participant list
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {participants.map(p => <ParticipantCard key={p.id} {...p} />)}
</div>

// Question timer - scales with screen size
<div className="text-4xl md:text-6xl lg:text-8xl font-bold">
  {timeRemaining}
</div>

// Answer buttons - full width on mobile, grid on desktop
<div className="flex flex-col md:grid md:grid-cols-2 gap-4">
  {answers.map(a => <AnswerButton key={a.id} {...a} />)}
</div>
```

**Best Practices**:
- ✅ Touch targets: minimum 44x44px (use `p-4` or larger)
- ✅ Font scaling: `text-base md:text-lg lg:text-xl`
- ✅ Spacing: generous on mobile (`p-6`), tighter on desktop (`md:p-4`)
- ✅ Test on real devices: Chrome DevTools, iPhone, iPad, Android

### Performance on Mobile
- ✅ Minimize animations (battery drain)
- ✅ Reduce WebSocket message frequency if needed
- ✅ Use CSS transforms (GPU-accelerated)
- ✅ Lazy load non-critical components

---

## 7. Room Code Generation Strategy

**Research Focus**: Best practices for shareable room codes

**Decision**: 6-character alphanumeric codes (uppercase)

**Rationale**:
- **Memorability**: Short enough to remember and type
- **Uniqueness**: 36^6 = 2.1 billion combinations (sufficient for 100-1000 concurrent rooms)
- **Readability**: Exclude ambiguous characters (0/O, 1/I/L)
- **Voice-friendly**: Can be spoken over phone/voice chat

**Character Set**: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 characters)
- Excludes: 0, O, 1, I, L (reduce confusion)

**Algorithm**:
```typescript
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

**Collision Handling**:
- Check if code exists before creating room
- Regenerate if collision detected (rare with 2.1B combinations)
- Low probability: Even with 10,000 rooms, collision probability < 0.01%

**Alternatives Considered**:
- **4 characters**: Too few combinations (32^4 = 1M, collision risk)
- **8 characters**: Too long to type/remember
- **UUIDs**: Too long, not user-friendly
- **Numeric only**: Harder to communicate (all sound alike)

---

## 8. Timer Synchronization Strategy

**Research Focus**: How to keep 3-minute countdown synchronized across clients

**Decision**: Server-authoritative timer with client-side countdown

**Approach**:
1. **Server starts timer**: Records start timestamp when game begins
2. **Server broadcasts**: Sends `startTime` and `duration` to all clients
3. **Clients calculate**: `timeRemaining = duration - (now - startTime)`
4. **Client updates**: Local countdown every 1 second for smooth UX
5. **Server enforces**: Server is source of truth for "time expired"

**Why This Works**:
- ✅ Server timestamp is authoritative (no cheating)
- ✅ Client-side countdown provides smooth UX (no network lag)
- ✅ Automatic synchronization (uses server time as reference)
- ✅ Tolerates network latency (clients compute locally)

**Handling Clock Drift**:
- **Accept 2-second variance** (per success criteria SC-006)
- **Periodic sync**: Server can send time checks every 30 seconds
- **No correction needed**: 2s drift acceptable for 3-minute timer

**Implementation**:
```typescript
// Server broadcasts
{ type: 'GAME_START', startTime: Date.now(), duration: 180000 }

// Client calculates
const timeRemaining = Math.max(0, 
  duration - (Date.now() - startTime)
);

// Client updates every second
setInterval(() => {
  setTimeRemaining(calculateTimeRemaining());
}, 1000);
```

**Edge Cases**:
- **Client tab backgrounded**: Browser may throttle timers
  - Solution: Recalculate on focus/visibility change
- **Client clock wrong**: Use server time as reference
  - Solution: Already handled by using `startTime` from server
- **Network delay**: Client receives start message late
  - Solution: Client immediately calculates current time (catches up)

---

## Summary

All NEEDS CLARIFICATION items have been resolved:

1. ✅ **WebSocket Library**: Native WebSocket API (zero dependencies)
2. ✅ **Concurrent Rooms**: Target 100, design for 1000+ (Durable Objects scale)
3. ✅ **Durable Objects Integration**: Hybrid Next.js + Cloudflare Workers architecture
4. ✅ **Best Practices**: Documented for WebSocket, Durable Objects, responsive design, room codes, timer sync

**Ready for Phase 1**: Data model design and API contract definition.
