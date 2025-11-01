# Implementation Plan: Express + Socket.IO Migration with Score Tracking

**Branch**: `002-express-socketio-migration` | **Date**: 2025-11-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-express-socketio-migration/spec.md`

## Summary

Migrate the trivia game backend from Cloudflare Durable Objects to Express.js with Socket.IO for real-time communication. Add cumulative score tracking across rounds (1 point per win), shareable room URLs (`/room/[CODE]`), and a share button with clipboard/native share support. The Express backend will run as a separate workspace in the Turborepo monorepo at `apps/backend`, maintaining all existing game functionality while enabling new features. Frontend remains Next.js with minimal changes to support new backend endpoints and score display.

## Technical Context

**Language/Version**: TypeScript 5+, Node.js 18+, Next.js 16.0.1, React 19.2.0  
**Primary Dependencies**: 
- Backend: Express 4.x, Socket.IO 4.x, cors, uuid
- Frontend: Next.js, React, Tailwind CSS, shadcn/ui (existing)
**Storage**: In-memory (Map-based room storage, 5-minute timeout, 100-room limit)  
**Testing**: NONE (per constitution - no testing infrastructure)  
**Target Platform**: Web (responsive: mobile 320px+, tablet 768px+, desktop 1024px+)  
**Project Type**: Turborepo monorepo with Express backend (`apps/backend`) and Next.js frontend (`apps/frontend`)  
**Performance Goals**: <1s real-time message delivery, <500ms state updates, <3s initial page load  
**Constraints**: 
- Port 3001 for Express backend (configurable via env)
- Maximum 100 concurrent rooms
- 5-minute inactivity timeout for empty rooms
- 30-second reconnection window for disconnected players
- Maintain backward compatibility with existing WebSocket message protocol
**Scale/Scope**: 
- Support 10+ concurrent rooms with 8 players each
- Handle 800+ concurrent Socket.IO connections
- Manage ~100 rooms × 8 players = 800 potential participants

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Clean Code**: Express backend organized into clear modules (routes, services, types). Socket.IO handlers separated by concern. TypeScript types throughout. No `any` types.
- [x] **Simple & Elegant UI**: Minimal UI changes - add score display, share button, leaderboard. Reuse existing shadcn/ui components. Focus on clarity.
- [x] **Responsive Design**: All new UI components (score display, share button) work on mobile/tablet/desktop using Tailwind responsive utilities.
- [x] **Minimal Dependencies**: Only 4 new backend deps (express, socket.io, cors, uuid). Frontend unchanged except backend URL config.
- [x] **No Testing**: Confirmed - no test files, no testing frameworks, no test configuration. Quality via manual testing only.
- [x] **Next.js + Tailwind + shadcn/ui**: Frontend continues using required stack. Backend is complementary Express service.

**Complexity Justifications**: 
- **Express backend**: Required for migration from Cloudflare Durable Objects. Simpler than serverless functions for stateful Socket.IO connections.
- **Socket.IO**: Required for WebSocket compatibility with existing frontend. Provides reconnection, room management, broadcast built-in.

## Project Structure

### Documentation (this feature)

```text
specs/002-express-socketio-migration/
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0: Technology decisions and patterns
├── data-model.md        # Phase 1: Room, Participant, Score entities
├── quickstart.md        # Phase 1: Local development setup
├── contracts/           # Phase 1: API and Socket.IO contracts
│   ├── http-api.md      # REST endpoints for room management
│   └── socketio-events.md # Socket.IO event specifications
└── tasks.md             # Phase 2: Implementation tasks (created by /speckit.tasks)
```

### Source Code (Turborepo Monorepo)

```text
apps/
├── backend/                    # NEW: Express + Socket.IO backend
│   ├── src/
│   │   ├── index.ts           # Server entry point
│   │   ├── app.ts             # Express app configuration
│   │   ├── server.ts          # HTTP + Socket.IO server setup
│   │   ├── routes/            # Express route handlers
│   │   │   ├── index.ts       # Route registration
│   │   │   ├── room.routes.ts # Room creation/validation endpoints
│   │   │   └── health.routes.ts # Health check endpoint
│   │   ├── services/          # Business logic
│   │   │   ├── room.service.ts      # Room management (create, join, cleanup)
│   │   │   ├── game.service.ts      # Game logic (start, answer, score)
│   │   │   └── question.service.ts  # Question selection
│   │   ├── socket/            # Socket.IO handlers
│   │   │   ├── index.ts       # Socket.IO setup and connection handler
│   │   │   ├── room.handler.ts      # JOIN, LEAVE handlers
│   │   │   ├── game.handler.ts      # READY, ANSWER handlers
│   │   │   └── broadcast.util.ts    # Helper for broadcasting messages
│   │   ├── types/             # TypeScript types
│   │   │   ├── room.types.ts        # Room, Participant, Round
│   │   │   ├── message.types.ts     # Socket.IO message types
│   │   │   └── game.types.ts        # Score, Question types
│   │   ├── utils/             # Utilities
│   │   │   ├── room-code.util.ts    # Generate 6-char room codes
│   │   │   ├── answer-check.util.ts # Answer validation
│   │   │   └── logger.util.ts       # Console logging
│   │   ├── config/            # Configuration
│   │   │   └── questions.json       # Trivia questions (copy from workers/)
│   │   └── store/             # In-memory storage
│   │       └── room.store.ts        # Map-based room storage with cleanup
│   ├── package.json           # Backend dependencies
│   ├── tsconfig.json          # TypeScript config
│   └── .env.example           # Environment variables template
│
└── frontend/                  # EXISTING: Next.js frontend (minimal changes)
    ├── app/
    │   ├── components/        # MODIFIED: Add score display components
    │   │   ├── leaderboard.tsx        # NEW: Score leaderboard
    │   │   ├── share-button.tsx       # NEW: Share link button
    │   │   └── [existing components]
    │   ├── lib/
    │   │   ├── websocket.ts   # MODIFIED: Update to Socket.IO client
    │   │   └── types.ts       # MODIFIED: Add score fields
    │   └── room/[code]/
    │       └── page.tsx       # MODIFIED: Extract room code from URL param
    └── [rest unchanged]

# Root configuration files
package.json              # Monorepo scripts
turbo.json               # MODIFIED: Add backend dev task
```

**Structure Decision**: Turborepo monorepo with separate Express backend at `apps/backend` alongside existing `apps/frontend`. This provides:
- Clear separation of concerns (backend/frontend)
- Independent deployment capability
- Shared TypeScript types via workspace references
- Parallel development with `turbo dev`

## Complexity Tracking

> No constitutional violations requiring justification. Express backend and Socket.IO are appropriate for the migration requirements and maintain clean, minimal architecture.

---

## Phase 0: Research ✅

**Status**: COMPLETE  
**Output**: `research.md` with 12 technical decisions documented

**Completed Decisions**:
1. ✅ Express.js 4.x framework selection
2. ✅ Socket.IO 4.x for WebSocket communication
3. ✅ In-memory Map storage with cleanup timers
4. ✅ Room code generation (6-char alphanumeric, no confusing chars)
5. ✅ Socket.IO room management pattern
6. ✅ Score tracking strategy (1 point per win, cumulative)
7. ✅ Frontend Socket.IO client migration
8. ✅ CORS configuration (dynamic origin validation)
9. ✅ Error handling patterns
10. ✅ Environment configuration (.env-based)
11. ✅ Logging strategy (console logging, structured format)
12. ✅ TypeScript strict configuration

---

## Phase 1: Design ✅

**Status**: COMPLETE  
**Output**: `data-model.md`, `contracts/http-api.md`, `contracts/socketio-events.md`, `quickstart.md`

### Deliverables Completed

**1. Data Model** (`data-model.md`) ✅
- Room entity with game state machine
- Participant entity with score tracking
- Question entity structure
- Round entity with answers
- ParticipantAnswer entity
- Score calculation logic (1 winner/round, tie-breaking)
- State transitions: lobby → active → results → lobby

**2. HTTP API Contract** (`contracts/http-api.md`) ✅
- POST /api/room/create endpoint
- GET /api/room/:code/validate endpoint
- GET /health endpoint
- Error response format
- CORS configuration
- OpenAPI 3.0 specification
- curl examples and frontend integration

**3. Socket.IO Events Contract** (`contracts/socketio-events.md`) ✅
- Client events: JOIN, READY, ANSWER, LEAVE
- Server events: ROOM_STATE, PLAYER_JOINED, PLAYER_READY, GAME_START, ANSWER_SUBMITTED, ANSWER_COUNT_UPDATE, ROUND_END, PLAYER_LEFT, ERROR, SESSION_LOST
- Score fields in ROOM_STATE and ROUND_END payloads
- Leaderboard with rankings
- TypeScript event definitions
- Connection lifecycle documentation
- Message flow examples
- Backend Socket.IO setup patterns

**4. Quickstart Guide** (`quickstart.md`) ✅
- Local development setup instructions
- Backend environment configuration
- Frontend API configuration
- Turborepo dev workflow
- Health check verification
- Testing procedures
- Troubleshooting guide
- Production build steps

### Constitution Re-Check ✅

All Phase 1 deliverables validated against constitution:
- [x] Clean Code: Clear data model, organized contract structure
- [x] Simple UI: Minimal changes documented
- [x] Responsive: Mobile-first documented in quickstart
- [x] Minimal Dependencies: Only 4 backend deps (express, socket.io, cors, uuid)
- [x] No Testing: Zero testing infrastructure mentioned
- [x] Required Stack: Next.js + Tailwind + shadcn/ui maintained

---

## Phase 2: Implementation Planning ✅

**Status**: COMPLETE  
**Output**: `tasks.md` with 90 implementation tasks

**Task Breakdown**:
- **Phase 1 - Setup**: 10 tasks (backend workspace initialization)
- **Phase 2 - Foundational**: 9 tasks (core infrastructure - BLOCKS all user stories)
- **Phase 3 - US1 Backend Migration**: 27 tasks (P1 - MVP milestone)
- **Phase 4 - US2 Score Tracking**: 10 tasks (P2 - extends US1)
- **Phase 5 - US3 Shareable Links**: 10 tasks (P3 - independent feature)
- **Phase 6 - US4 Share Button**: 10 tasks (P4 - extends US3)
- **Phase 7 - Polish**: 14 tasks (cross-cutting concerns, cleanup)

**Key Insights**:
- 15 tasks marked [P] for parallel execution
- US1 (Backend Migration) is foundational MVP - 46 total tasks to complete
- US3 (Shareable Links) can run in parallel with US1/US2 (independent)
- US2 depends on US1, US4 depends on US3
- Manual testing checklist per quickstart.md included

---

## Phase 3: Implementation

**Status**: READY TO START  
**Prerequisites**: Phase 2 tasks.md created ✅

**Implementation Order** (from tasks.md):
1. **Setup** (T001-T010): Backend workspace, TypeScript config, type definitions
2. **Foundational** (T011-T019): Utilities, RoomStore, Express app, Socket.IO server
3. **US1 - Backend Migration** (T020-T046): HTTP routes, Socket.IO handlers, game services, frontend migration
4. **US2 - Score Tracking** (T047-T056): Score calculation, leaderboard, UI updates
5. **US3 - Shareable Links** (T057-T066): Validation endpoint, dynamic route, URL handling
6. **US4 - Share Button** (T067-T076): Share component, clipboard API, mobile share
7. **Polish** (T077-T090): Error handling, logging, documentation, cleanup

**Recommended Start**: Complete T001-T046 (Setup + Foundational + US1) for MVP

---

## Next Steps

1. **Generate Tasks**: Run `/speckit.tasks` to create implementation task list
2. **Update Agent Context**: Run `.specify/scripts/bash/update-agent-context.sh copilot` to add Express/Socket.IO to agent knowledge
3. **Begin Implementation**: Start with Phase 3 backend scaffolding tasks
4. **Verify Functionality**: Manual testing using quickstart guide procedures

---

## Changelog

- **2025-11-01**: Initial plan created
- **2025-11-01**: Phase 0 research.md completed (12 decisions)
- **2025-11-01**: Phase 1 data-model.md completed (6 entities)
- **2025-11-01**: Phase 1 contracts/http-api.md completed (3 endpoints)
- **2025-11-01**: Phase 1 contracts/socketio-events.md completed (10 events)
- **2025-11-01**: Phase 1 quickstart.md completed (setup guide)
- **2025-11-01**: Phase 1 COMPLETE, ready for Phase 2 task generation
- **2025-11-01**: Phase 2 tasks.md completed (90 tasks organized by user story)
- **2025-11-01**: Phase 2 COMPLETE, ready for Phase 3 implementation
