# Quickstart Guide: Express + Socket.IO Backend

**Feature**: 002-express-socketio-migration  
**Target Environment**: Local development with Turborepo  
**Prerequisites**: Node.js 18+, npm 9+

---

## Project Structure

After implementation, the monorepo will have:

```
trivia/
├── apps/
│   ├── backend/        # NEW: Express + Socket.IO server
│   │   ├── src/
│   │   │   ├── routes/        # HTTP endpoint handlers
│   │   │   ├── socket/        # Socket.IO event handlers
│   │   │   ├── services/      # Business logic
│   │   │   ├── store/         # In-memory room storage
│   │   │   ├── types/         # TypeScript interfaces
│   │   │   ├── utils/         # Helper functions
│   │   │   ├── config/        # Configuration
│   │   │   └── index.ts       # Server entry point
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   └── frontend/       # EXISTING: Next.js app (updated)
│       ├── app/
│       ├── components/
│       └── ...
│
├── turbo.json
└── package.json
```

---

## Step 1: Install Dependencies

### Root Dependencies

```bash
# From repo root
npm install
```

This installs all workspace dependencies via Turborepo.

---

## Step 2: Backend Setup

### Install Backend Dependencies

```bash
cd apps/backend
npm install express socket.io cors uuid @types/express @types/cors @types/uuid
```

**Dependencies**:
- `express`: HTTP server framework
- `socket.io`: WebSocket library
- `cors`: CORS middleware
- `uuid`: Unique ID generation
- `@types/*`: TypeScript type definitions

### Environment Configuration

Create `.env` file in `apps/backend/`:

```bash
# apps/backend/.env
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000
FRONTEND_BASE_URL=http://localhost:3000
NODE_ENV=development
MAX_ROOMS=100
ROOM_CLEANUP_TIMEOUT=300000
RECONNECT_TIMEOUT=30000
```

**Environment Variables**:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Express server port | `3001` |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | `http://localhost:3000` |
| `FRONTEND_BASE_URL` | Frontend URL for shareable links | `http://localhost:3000` |
| `NODE_ENV` | Environment mode | `development` |
| `MAX_ROOMS` | Maximum concurrent rooms | `100` |
| `ROOM_CLEANUP_TIMEOUT` | Inactive room cleanup (ms) | `300000` (5 min) |
| `RECONNECT_TIMEOUT` | Player reconnection window (ms) | `30000` (30 sec) |

### TypeScript Configuration

`apps/backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Package Scripts

`apps/backend/package.json`:

```json
{
  "name": "backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1",
    "cors": "^2.8.5",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/uuid": "^9.0.7",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

---

## Step 3: Frontend Setup

### Update API Configuration

Create or update `apps/frontend/lib/config.ts`:

```typescript
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
};
```

### Environment Variables

Create `apps/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Install Socket.IO Client

```bash
cd apps/frontend
npm install socket.io-client
```

### Update Frontend API Calls

Replace Cloudflare Workers fetch calls with Express endpoints:

**Before (Durable Objects)**:
```typescript
const response = await fetch('/api/room/create', { method: 'POST' });
```

**After (Express)**:
```typescript
import { API_CONFIG } from '@/lib/config';

const response = await fetch(`${API_CONFIG.baseUrl}/api/room/create`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});
```

---

## Step 4: Run Development Environment

### Using Turborepo (Recommended)

From repo root:

```bash
npm run dev
```

This runs both frontend (port 3000) and backend (port 3001) in parallel.

### Manual Start (Individual Apps)

**Terminal 1 - Backend**:
```bash
cd apps/backend
npm run dev
```

**Terminal 2 - Frontend**:
```bash
cd apps/frontend
npm run dev
```

---

## Step 5: Verify Setup

### Check Backend Health

```bash
curl http://localhost:3001/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": 1698765432000,
  "uptime": 12.345,
  "rooms": {
    "active": 0,
    "capacity": 100
  }
}
```

### Check Frontend

Visit `http://localhost:3000` in browser. You should see the trivia rooms lobby (create/join UI).

### Test Room Creation

**Via curl**:
```bash
curl -X POST http://localhost:3001/api/room/create
```

**Expected Response**:
```json
{
  "roomCode": "A3B7K9",
  "shareableUrl": "http://localhost:3000/room/A3B7K9"
}
```

**Via Frontend**:
1. Click "Create Room"
2. You should be redirected to `/room/[CODE]`
3. Enter your name and join

### Test Socket.IO Connection

Open browser DevTools → Network → WS (WebSockets). You should see:

```
Status: 101 Switching Protocols
Type: websocket
URL: ws://localhost:3001/socket.io/?EIO=4&transport=websocket
```

---

## Step 6: Common Development Tasks

### Create a Room

```bash
curl -X POST http://localhost:3001/api/room/create
# Response: { "roomCode": "ABC123", "shareableUrl": "http://localhost:3000/room/ABC123" }
```

### Validate a Room

```bash
curl http://localhost:3001/api/room/ABC123/validate
# Response: { "exists": true, "canJoin": true, "participantCount": 0, "gameState": "lobby" }
```

### Join a Room (Socket.IO)

Use browser console at `http://localhost:3000/room/ABC123`:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');
socket.on('connect', () => {
  socket.emit('JOIN', {
    playerId: crypto.randomUUID(),
    playerName: 'TestPlayer',
    roomCode: 'ABC123',
  });
});

socket.on('ROOM_STATE', (state) => console.log('Room State:', state));
```

---

## Step 7: Production Build

### Build Backend

```bash
cd apps/backend
npm run build
```

Outputs compiled JavaScript to `dist/`.

### Run Production Backend

```bash
cd apps/backend
npm start
```

### Environment Variables (Production)

Update `.env` for production:

```bash
PORT=3001
ALLOWED_ORIGINS=https://trivia.app,https://www.trivia.app
FRONTEND_BASE_URL=https://trivia.app
NODE_ENV=production
MAX_ROOMS=100
ROOM_CLEANUP_TIMEOUT=300000
RECONNECT_TIMEOUT=30000
```

---

## Troubleshooting

### Issue: Backend won't start

**Symptom**: `Error: listen EADDRINUSE: address already in use :::3001`

**Solution**:
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change PORT in .env
PORT=3002
```

### Issue: CORS errors in browser

**Symptom**: `Access to fetch at 'http://localhost:3001' blocked by CORS policy`

**Solution**: Verify `ALLOWED_ORIGINS` in backend `.env` includes frontend URL:
```bash
ALLOWED_ORIGINS=http://localhost:3000
```

### Issue: Socket.IO connection fails

**Symptom**: `WebSocket connection failed` in browser console

**Solution**:
1. Check backend is running: `curl http://localhost:3001/health`
2. Verify `NEXT_PUBLIC_SOCKET_URL` in frontend `.env.local`
3. Check browser Network tab for 101 status code
4. Ensure no proxy blocking WebSocket upgrade

### Issue: Room not found after creation

**Symptom**: `ROOM_NOT_FOUND` error after creating room

**Solution**: Check backend logs for room creation. Verify room code matches:
```bash
# Backend logs should show:
# [RoomService] Room created: ABC123
```

### Issue: Players can't join room

**Symptom**: `GAME_IN_PROGRESS` error when game is not started

**Solution**: Check room state via health endpoint:
```bash
curl http://localhost:3001/health
# Check rooms.active count
```

If room limit reached (100), wait for inactive rooms to clean up (5 minutes).

---

## Development Workflow

### Making Changes

1. **Backend changes**: Edit files in `apps/backend/src/`
   - Server auto-reloads with `tsx watch`
   - Check terminal for compilation errors

2. **Frontend changes**: Edit files in `apps/frontend/app/`
   - Next.js Fast Refresh updates browser
   - Check browser console for errors

3. **Shared types**: Update types in `apps/backend/src/types/`
   - Rebuild backend: `npm run build`
   - Restart dev server if needed

### Testing Flow

1. Start dev environment: `npm run dev` (from root)
2. Create room via frontend
3. Open room in two browser tabs (simulate 2 players)
4. Test game flow:
   - Join with different names
   - Toggle ready
   - Start game
   - Submit answers
   - View results with scores
   - Start next round

### Monitoring

Watch backend logs for:
- Room creation: `[RoomService] Room created: ABC123`
- Player joins: `[SocketHandler] Player joined: Alice`
- Answer submissions: `[GameService] Answer submitted: Alice`
- Round endings: `[GameService] Round ended, winner: Alice`
- Room cleanup: `[RoomStore] Room cleaned up: ABC123`

---

## Next Steps

After local setup works:

1. **Implement scoring display** in frontend
   - Update `ParticipantCard` to show scores
   - Add leaderboard component
   - Show score changes in round results

2. **Add shareable links** in frontend
   - Display shareable URL in room lobby
   - Add "Share" button with clipboard copy
   - Show "Copied!" feedback

3. **Deploy backend**
   - Choose hosting (Railway, Fly.io, DigitalOcean)
   - Set production environment variables
   - Update frontend `NEXT_PUBLIC_API_URL`

4. **Remove Cloudflare Workers code**
   - Delete `workers/` directory
   - Remove Wrangler configuration
   - Update deployment docs

---

## Reference

- **Spec**: `specs/002-express-socketio-migration/spec.md`
- **HTTP API**: `specs/002-express-socketio-migration/contracts/http-api.md`
- **Socket.IO Events**: `specs/002-express-socketio-migration/contracts/socketio-events.md`
- **Data Model**: `specs/002-express-socketio-migration/data-model.md`

For detailed technical decisions, see `specs/002-express-socketio-migration/research.md`.
