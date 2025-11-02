# Trivia Room System (Frontend)

A real-time multiplayer trivia game built with Next.js 16 that connects to an Express + Socket.IO backend.

## 🎯 Features

- **Create & Join Rooms**: Generate unique 6-character room codes to share with friends
- **Real-time Gameplay**: WebSocket-powered synchronization across all players
- **Multiple Rounds**: Play through 10 trivia questions with persistent rooms
- **Answer Verification**: Smart answer matching with accepted variations
- **Winner Detection**: Fastest correct answer wins each round
- **Responsive Design**: Optimized for mobile (320px+), tablet (768px+), and desktop (1024px+)
- **Accessibility**: Full keyboard navigation, ARIA labels, and screen reader support

## 🏗️ Tech Stack

### Frontend
- **Next.js 16.0.1** - React framework with App Router
- **React 19.2.0** - UI library
- **TypeScript 5+** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **shadcn/ui** - Accessible component library

### Backend
- **Express 4.x** - HTTP API server (apps/backend)
- **Socket.IO 4.x** - Real-time bidirectional communication

## 📁 Project Structure

```
trivia/
├── app/                          # Next.js App Router
│   ├── api/                      # HTTP API endpoints
│   │   └── room/
│   │       ├── create/           # POST /api/room/create
│   │       └── [code]/
│   │           ├── route.ts      # GET /api/room/[code]
│   │           └── join/         # POST /api/room/[code]/join
│   ├── components/               # React components
│   │   ├── create-room-form.tsx
│   │   ├── join-room-form.tsx
│   │   ├── room-lobby.tsx
│   │   ├── game-question.tsx
│   │   ├── game-timer.tsx
│   │   ├── round-results.tsx
│   │   └── ...
│   ├── lib/                      # Utilities and types
│   │   ├── types.ts              # TypeScript definitions
│   │   ├── questions.ts          # Trivia questions data
│   │   ├── websocket.ts          # WebSocket client
│   │   └── room-state.ts         # State management
│   ├── room/[code]/              # Dynamic room pages
│   │   └── page.tsx
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── apps/backend/                 # Express + Socket.IO backend
├── components/ui/                # shadcn/ui components
└── specs/                        # Design documents

```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20+)
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd trivia
   ```

2. **Install dependencies**
   ```bash
   # From repo root
   npm install
   ```

3. **Set up environment variables**
   
   Create `apps/frontend/.env.local`:
   ```env
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

### Development

1. **Start both servers from repo root**
   ```bash
   npm run dev
   # Starts backend on :3001 and frontend on :3000
   ```

3. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎮 How to Play

1. **Create a Room**
   - Enter your name
   - Click "Create Room"
   - Share the 6-character room code with friends

2. **Join a Room**
   - Enter your name
   - Enter the room code
   - Click "Join Room"

3. **Ready Up**
   - Wait for all players to join
   - Click "Ready" when you're set
   - Game starts automatically when all are ready

4. **Answer Questions**
   - Read the question
   - Type your answer
   - Submit before the 3-minute timer expires
   - Wait for other players

5. **View Results**
   - See the correct answer
   - Winner is the fastest correct responder
   - Ready up for the next round or leave

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO server URL | `http://localhost:3001` |
| `NEXT_PUBLIC_API_URL` | HTTP API base URL | `http://localhost:3001` |

Backend runs separately; see apps/backend/README or repo root README for details.

## 📝 API Documentation

### HTTP Endpoints

#### Create Room
```http
POST /api/room/create
Content-Type: application/json

{
  "name": "Alice"
}

Response:
{
  "roomCode": "ABC123",
  "playerId": "uuid-here"
}
```

#### Validate Room
```http
GET /api/room/ABC123

Response:
{
  "exists": true
}
```

#### Join Room
```http
POST /api/room/ABC123/join
Content-Type: application/json

{
  "name": "Bob"
}

Response:
{
  "playerId": "uuid-here"
}
```

### WebSocket Protocol

Socket.IO client connects to `NEXT_PUBLIC_SOCKET_URL`.

**Client Messages**:
- `JOIN`: Join room with player info
- `READY`: Toggle ready status
- `ANSWER`: Submit answer with text and timestamp
- `LEAVE`: Leave the room

**Server Messages**:
- `ROOM_STATE`: Full room state on connect
- `PLAYER_JOINED`: New player joined
- `PLAYER_LEFT`: Player left
- `PLAYER_READY`: Player ready status changed
- `GAME_START`: Game starting with question
- `ANSWER_SUBMITTED`: Confirmation of answer
- `ANSWER_COUNT_UPDATE`: How many answered
- `ROUND_END`: Results with winner

## 🧪 Development Commands

```bash
# Next.js development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Backend (Express)
cd ../backend
npm run dev          # Start backend on :3001
```

## 🌐 Deployment

### Deploy Next.js to Vercel

1. Push your code to GitHub
2. Import the repository to Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_WS_URL` → Your Workers URL (wss://...)
   - `NEXT_PUBLIC_API_URL` → Your Workers URL (https://...)
4. Deploy!

### Deploy Workers to Cloudflare

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Deploy:
   ```bash
   cd workers
   npm run deploy
   ```

4. Note your Workers URL and update Next.js environment variables

## 🎨 Customization

### Adding Questions

Edit `workers/questions.json`:

```json
{
  "id": "11",
  "text": "Your question here?",
  "correctAnswer": "Answer",
  "acceptedAnswers": ["Answer", "answer", "Alternative"]
}
```

### Styling

- Global styles: `app/globals.css`
- Tailwind config: `tailwind.config.ts`
- Component styles: Tailwind utility classes

### Game Rules

Edit constants in `workers/room-durable-object.ts`:
- `MAX_PARTICIPANTS`: Room capacity (default: 10)
- `ROUND_DURATION`: Question timer (default: 180000ms / 3 minutes)

## 📋 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js and Cloudflare Workers
