# Implementation Plan: Game Stability and Customization Improvements

**Branch**: `004-game-stability-improvements` | **Date**: November 6, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-game-stability-improvements/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature improves the trivia system's stability and user experience by:
1. **Critical Stability Fixes (P1)**: Handling player disconnections gracefully and enabling seamless page refresh recovery
2. **Enhanced Gameplay (P2)**: Adding spectator mode for mid-game joins, question category selection, and AI feedback mode customization
3. **Player Control (P3)**: Implementing vote-to-end-game functionality on results pages
4. **Scalability**: Increasing room capacity from 8 to 16 active players

**Technical Approach**: Enhance the existing Socket.IO-based real-time architecture with improved connection state management, participant role transitions (active ↔ spectator), and extended room configuration (categories, feedback modes, player limits). Backend changes focus on room.store.ts, game.service.ts, and socket handlers. Frontend changes add UI controls and state synchronization.

## Technical Context

**Language/Version**: TypeScript 5+, Node.js 18+, Next.js 16.0.1, React 19.2.0
**Primary Dependencies**: 
- Frontend: Next.js 16.0.1, React 19.2.0, Tailwind CSS 4, shadcn/ui, Socket.IO Client 4.8.1, Clerk (auth)
- Backend: Express 4.18.2, Socket.IO 4.6.1, Prisma 6.18.0, PostgreSQL, Clerk SDK
**Storage**: PostgreSQL (hosted or local) with Prisma ORM for schema management and migrations
**Testing**: NONE (per constitution - no testing infrastructure)
**Target Platform**: Web (responsive: mobile 320px+, tablet 768px+, desktop 1024px+)
**Project Type**: Turborepo monorepo with Next.js App Router frontend + Express backend
**Performance Goals**: 
- <3s browser refresh recovery time
- <5s disconnection detection
- <1s spectator update latency
- <2s vote threshold calculation and broadcast
- Smooth performance with 16 active players + unlimited spectators
**Constraints**:
- In-memory room storage (existing Map-based implementation)
- 5-minute room cleanup timeout for empty rooms
- 16 active player limit per room
- 10 minimum questions per category
- Socket.IO for real-time communication (existing infrastructure)
**Scale/Scope**: 
- 6 user stories (4 new features + 2 critical fixes)
- Modifications to 8-10 existing backend files
- New UI components for category selection, feedback mode, vote controls, spectator indicators
- Database schema additions for question categories (if not already present)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Clean Code**: Yes - refactoring existing handlers for better separation of concerns (connection state, role transitions). New service methods will be single-purpose.
- [x] **Simple & Elegant UI**: Yes - category/feedback mode selects use standard dropdown patterns. Vote button appears contextually on results page. Spectator indicators use subtle visual distinction.
- [x] **Responsive Design**: Yes - all new UI controls designed mobile-first with appropriate touch targets. Category/feedback selects work on all screen sizes.
- [x] **Minimal Dependencies**: Yes - no new dependencies required. Leverages existing Socket.IO, Prisma, shadcn/ui components.
- [x] **No Testing**: Confirmed - no test infrastructure planned. Quality verified through manual testing and code review.
- [x] **Next.js + Tailwind + shadcn/ui**: Yes - frontend uses Next.js App Router with Tailwind CSS and shadcn/ui Select, Button, Badge components.

**Complexity Justifications**: None - this feature builds on existing architecture without introducing new patterns or dependencies.

## Project Structure

### Documentation (this feature)

```text
specs/004-game-stability-improvements/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (already exists)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated)
│   ├── http-api.md      # REST API additions
│   └── socketio-events.md # Socket.IO event updates
├── checklists/          # Quality validation
│   └── requirements.md  # Specification checklist (already exists)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Turborepo monorepo structure (existing)
apps/
├── backend/                    # Express + Socket.IO backend
│   ├── src/
│   │   ├── services/
│   │   │   ├── game.service.ts       # [MODIFY] Add reconnection, spectator, vote logic
│   │   │   ├── room.service.ts       # [MODIFY] Add category validation, player limit checks
│   │   │   └── question.service.ts   # [MODIFY] Category filtering logic
│   │   ├── socket/
│   │   │   ├── game.handler.ts       # [MODIFY] Vote-to-end handlers
│   │   │   ├── room.handler.ts       # [MODIFY] Join/reconnect with spectator mode
│   │   │   └── index.ts              # [MODIFY] Disconnect event improvements
│   │   ├── store/
│   │   │   └── room.store.ts         # [MODIFY] Add category, feedbackMode, voteState, maxPlayers
│   │   ├── types/
│   │   │   ├── room.types.ts         # [MODIFY] Add Participant.role, Room.category, Room.feedbackMode, VoteState
│   │   │   └── game.types.ts         # [MODIFY] Add spectator-related types
│   │   ├── routes/
│   │   │   └── room.routes.ts        # [MODIFY] Add category list endpoint
│   │   └── config/
│   │       └── questions.ts          # [MODIFY] Category validation
│   └── prisma/
│       └── schema.prisma             # [MODIFY IF NEEDED] Add Question.category if missing
│
└── frontend/                   # Next.js App Router frontend
    ├── app/
    │   ├── room/
    │   │   └── [code]/
    │   │       └── page.tsx          # [MODIFY] Add spectator UI, vote controls, connection indicators
    │   ├── groups/
    │   │   └── [groupId]/
    │   │       └── page.tsx          # [MODIFY] Add category/feedback mode selects to room creation
    │   └── lobby/
    │       └── [code]/
    │           └── page.tsx          # [MODIFY] Display category and feedback mode settings
    ├── components/
    │   ├── game/
    │   │   ├── SpectatorBadge.tsx    # [NEW] Visual indicator for spectators
    │   │   ├── ConnectionStatus.tsx   # [NEW] Player connection indicator
    │   │   ├── VoteToEndButton.tsx   # [NEW] Vote button with count display
    │   │   └── ResultsPage.tsx       # [MODIFY] Add vote controls
    │   └── lobby/
    │       ├── CategorySelect.tsx    # [NEW] Category dropdown for room creation
    │       ├── FeedbackModeSelect.tsx # [NEW] Feedback mode selector
    │       └── RoomSettings.tsx      # [NEW] Display selected settings in lobby
    └── lib/
        └── socket.ts                 # [MODIFY] Handle new socket events (spectator transitions, votes)

components/                     # Shared shadcn/ui components (existing)
└── ui/
    ├── select.tsx              # [USE] For category and feedback mode
    ├── button.tsx              # [USE] For vote button
    └── badge.tsx               # [USE] For spectator indicators
```

**Structure Decision**: Turborepo monorepo with separate frontend (Next.js App Router) and backend (Express + Socket.IO) applications. This structure already exists and is appropriate for real-time multiplayer features requiring separate frontend/backend concerns. Most work involves modifying existing files rather than adding new structure.

## Phase 0: Research & Architecture Decisions

*Generated research.md with all technical unknowns resolved before design.*

**Status**: ✅ Complete

**Output**: [research.md](./research.md)

**Key Decisions**:
1. **Connection State Management**: Socket.IO disconnect events with 5-second timeout, participant marked as `connectionStatus: 'disconnected'` but retained in room for reconnection
2. **Role State Machine**: Participant role ('active' | 'spectator') orthogonal to connection status, transitions defined in data model
3. **Vote State Tracking**: Set-based `votedParticipantIds` with dynamic threshold calculation (50% of active+connected participants)
4. **Question Categories**: Database-driven with `Question.category` field, minimum 10 questions per category for validity
5. **Feedback Modes**: Room-level configuration ('supportive' | 'neutral' | 'roast') passed to AI service, replaces boolean `roastMode`
6. **Refresh Recovery**: Reconnection via `userId` (authenticated) or `participantId` stored in localStorage (anonymous)
7. **Room Cleanup**: 5-minute setTimeout-based cleanup for empty rooms, cancellable on reconnection

See research.md for implementation patterns and detailed analysis.

---

## Phase 1: Design & Contracts

*Generated data-model.md, contracts/, and quickstart.md. This is the last phase of /speckit.plan.*

**Status**: ✅ Complete

### Data Model

**Output**: [data-model.md](./data-model.md)

**Key Entities**:
- **Participant**: Added `role: ParticipantRole`, explicit `connectionStatus: 'connected' | 'disconnected'`
- **VoteState** (new): `{ votedParticipantIds: Set<string>, createdAt: number, threshold: number }`
- **Room**: Added `selectedCategory: string | null`, `feedbackMode: FeedbackMode`, `voteState: VoteState | null`, `cleanupTimer: NodeJS.Timeout | null`, `maxActivePlayers: 16`
- **Question**: May require `category: string` field (verify schema)

**State Machines**:
- Game flow: lobby → active → results → (next question or vote-to-end → lobby)
- Role transitions: active ↔ spectator based on game state, connection status, player count

### API Contracts

**Output**: 
- [contracts/http-api.md](./contracts/http-api.md)
- [contracts/socketio-events.md](./contracts/socketio-events.md)

**New HTTP Endpoints**:
- `GET /api/questions/categories` - Fetch available categories with question counts

**Modified HTTP Endpoints**:
- `POST /api/rooms` - Accept `selectedCategory` and `feedbackMode` options

**New Socket.IO Events**:
- `VOTE_TO_END` - Cast vote to end game early
- `CANCEL_VOTE` - Remove own vote
- `RECONNECTED` - Acknowledgment of successful reconnection

**Modified Socket.IO Events**:
- `JOIN` - Enhanced with reconnection detection, spectator role assignment, `participantId` handling
- `CREATE_ROOM` - Accept category and feedback mode configuration
- `disconnect` - Mark as disconnected but retain in room, start cleanup timer if empty
- `PLAYER_READY` - Clear vote state when readying up
- `SUBMIT_ANSWER` - Check active role, exclude disconnected from completion
- `NEXT_QUESTION` - Promote spectators to active if slots available

**Broadcast Events**:
- `VOTE_UPDATED` - Vote progress update (count, threshold, progress percentage)
- `PARTICIPANT_LEFT` - Enhanced with `connectionStatus` distinction

### Developer Onboarding

**Output**: [quickstart.md](./quickstart.md)

**Contents**:
- Setup instructions (branch, database migration, dependencies)
- Development workflow (phased implementation approach)
- Testing checklist (reconnection, disconnection, spectator, voting scenarios)
- Manual testing flows for critical paths
- Debugging tips for Socket.IO events, localStorage, vote calculations
- Common pitfalls and best practices

---

## Re-evaluation: Constitution Check (Post-Design)

*Re-check constitution after design phase to ensure no violations.*

- [x] **Clean Code**: Confirmed - service methods remain single-purpose, socket handlers use clear event names, type definitions are explicit
- [x] **Simple & Elegant UI**: Confirmed - category/feedback mode use shadcn/ui Select, vote button appears only on results, spectator badge is subtle
- [x] **Responsive Design**: Confirmed - all new components designed mobile-first
- [x] **Minimal Dependencies**: Confirmed - no new dependencies added
- [x] **No Testing**: Confirmed - no test files generated
- [x] **Next.js + Tailwind + shadcn/ui**: Confirmed - all frontend components use approved stack

**Final Verdict**: ✅ No constitution violations. Feature ready for implementation.

---

## Planning Complete

**Branch**: `004-game-stability-improvements`
**Implementation Plan**: `/Users/sanketnaik99/Coding/React/trivia/specs/004-game-stability-improvements/plan.md`

**Generated Artifacts**:
- ✅ `research.md` - 7 research questions answered with implementation patterns
- ✅ `data-model.md` - Entity definitions, state machines, validation rules, migration strategy
- ✅ `contracts/http-api.md` - HTTP endpoint specifications (1 new, 1 modified)
- ✅ `contracts/socketio-events.md` - Socket.IO event definitions (3 new, 6 modified, client examples)
- ✅ `quickstart.md` - Developer setup guide with testing checklists
- ✅ `.github/copilot-instructions.md` - Updated with new technologies/patterns

**Next Steps**:
1. Run `/speckit.tasks` to generate implementation tasks from this plan
2. Follow quickstart.md for development environment setup
3. Implement in phases: Types → Services → Socket Handlers → Frontend Components
4. Test each phase using checklist in quickstart.md
5. Manual QA all critical flows (reconnection, voting, spectator transitions)

**Key Files to Modify**:
- Backend: `room.types.ts`, `room.store.ts`, `room.service.ts`, `game.service.ts`, `question.service.ts`, `room.handler.ts`, `game.handler.ts`
- Frontend: `room/[code]/page.tsx`, `groups/[id]/page.tsx`, new components for spectator/vote/category UI
- Database: Potential `prisma/schema.prisma` addition for Question.category field

**Implementation Complexity**: Medium (existing Socket.IO patterns, additive changes, careful state management required for roles and votes)

**Estimated Timeline**: 2-3 days for implementation + 1 day for thorough manual testing

---

*This plan was generated by `/speckit.plan` command on November 6, 2025. Refer to `.specify/templates/commands/plan.md` for workflow details.*
````
