# Tasks: Express + Socket.IO Migration with Score Tracking

**Input**: Design documents from `/specs/002-express-socketio-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/http-api.md, contracts/socketio-events.md

**Tests**: Per project constitution, this project does NOT include testing infrastructure. Quality assurance is performed through code review and manual testing per quickstart.md procedures.

**Organization**: Tasks are grouped by user story to enable independent implementation of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This project uses Turborepo monorepo structure:
- **Backend**: `apps/backend/src/`
- **Frontend**: `apps/frontend/app/`
- **Root**: Root-level configuration files

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize Express backend workspace and configure monorepo

 - [X] T001 Create backend workspace directory structure at apps/backend/
 - [X] T002 Create apps/backend/package.json with Express, Socket.IO, cors, uuid dependencies
 - [X] T003 Create apps/backend/tsconfig.json with strict mode and path aliases (@/*)
 - [X] T004 Create apps/backend/.env.example with PORT, ALLOWED_ORIGINS, FRONTEND_BASE_URL, MAX_ROOMS, ROOM_CLEANUP_TIMEOUT, RECONNECT_TIMEOUT
 - [X] T005 Copy workers/questions.json to apps/backend/src/config/questions.json
 - [X] T006 Update root turbo.json to add backend dev task with port 3001
 - [X] T007 [P] Create apps/backend/src/types/room.types.ts with Room, Participant, Round, ParticipantAnswer interfaces per data-model.md
 - [X] T008 [P] Create apps/backend/src/types/message.types.ts with Socket.IO client and server event interfaces per socketio-events.md
 - [X] T009 [P] Create apps/backend/src/types/game.types.ts with Question, GameState, ConnectionStatus types
 - [X] T010 Create apps/backend/src/config/env.ts to load and validate environment variables with typed config object

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

 - [X] T011 Create apps/backend/src/utils/logger.util.ts with structured JSON logging (info, error, warn methods)
 - [X] T012 Create apps/backend/src/utils/room-code.util.ts to generate 6-char alphanumeric codes (exclude 0/O/I/1/L)
 - [X] T013 Create apps/backend/src/utils/answer-check.util.ts to normalize and validate answers against correct/accepted answers
 - [X] T014 Create apps/backend/src/store/room.store.ts with Map-based storage, cleanup timers, and room lifecycle methods (createRoom, getRoom, deleteRoom, scheduleCleanup, cancelCleanup, getRoomCount)
 - [X] T015 Create apps/backend/src/services/question.service.ts to load questions from config, select random unused questions, track used IDs
 - [X] T016 Create apps/backend/src/app.ts to configure Express app with CORS middleware, JSON body parser, error handling
 - [X] T017 Create apps/backend/src/server.ts to create HTTP server, attach Socket.IO, configure Socket.IO with CORS
 - [X] T018 Create apps/backend/src/socket/broadcast.util.ts with helper functions for broadcasting to rooms (toRoom, toSocket, toAllExcept)
 - [X] T019 Create apps/backend/src/index.ts as server entry point to load env, start HTTP server, initialize Socket.IO connection handler

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Backend Migration Preserves Existing Functionality (Priority: P1) 🎯 MVP

**Goal**: Migrate from Cloudflare Durable Objects to Express + Socket.IO while maintaining all existing trivia game functionality (create rooms, join rooms, ready up, answer questions, view results, continue to next round)

**Validation**: Create a room via HTTP POST, join with 2 players via Socket.IO JOIN, ready up both players, wait for game start countdown, submit answers via ANSWER, verify round end with ROUND_END message, ready up for next round. Verify all Socket.IO messages match spec 001 format. Disconnect one player and reconnect within 30 seconds to verify state restoration.

### HTTP Endpoints for User Story 1

- [X] T020 [P] [US1] Create apps/backend/src/routes/room.routes.ts with POST /create endpoint (generate code, check limit, create room, return code + shareable URL)
- [X] T021 [P] [US1] Create apps/backend/src/routes/health.routes.ts with GET /health endpoint (return status, uptime, timestamp, room count)
- [X] T022 [US1] Create apps/backend/src/routes/index.ts to register all route modules with Express app

### Room Service for User Story 1

- [X] T023 [US1] Create apps/backend/src/services/room.service.ts with createRoom method (generate unique code, validate limit, initialize room state)
- [X] T024 [US1] Add validateRoomCode method to room.service.ts (check exists, check joinable, return participant count and game state)
- [X] T025 [US1] Add addParticipant method to room.service.ts (validate name unique, check room not full, create participant with ID, add to room)
- [X] T026 [US1] Add removeParticipant method to room.service.ts (remove from participants Map, schedule cleanup if empty)
- [X] T027 [US1] Add updateLastActivity method to room.service.ts (update timestamp, cancel existing cleanup timer)

### Socket.IO JOIN/LEAVE Handlers for User Story 1

- [X] T028 [US1] Create apps/backend/src/socket/room.handler.ts with handleJoin function (validate room exists, add participant, join Socket.IO room, cancel cleanup, broadcast PLAYER_JOINED, send ROOM_STATE)
- [X] T029 [US1] Add handleLeave function to socket/room.handler.ts (remove participant, broadcast PLAYER_LEFT, disconnect socket, schedule cleanup if empty)
- [X] T030 [US1] Add handleDisconnect function to socket/room.handler.ts (mark participant disconnected, start 30-second reconnection timer, broadcast updated ROOM_STATE)

### Game Service for User Story 1

- [X] T031 [US1] Create apps/backend/src/services/game.service.ts with startGame method (select random question, create round, transition to 'active', broadcast GAME_START with question and timer)
- [X] T032 [US1] Add handleReady method to game.service.ts (toggle participant ready state, broadcast PLAYER_READY, check if all ready, start 15-second countdown if all ready)
- [X] T033 [US1] Add handleAnswer method to game.service.ts (validate game active, check not already answered, check answer correctness, store answer with timestamp, broadcast ANSWER_SUBMITTED, broadcast ANSWER_COUNT_UPDATE, end round if all answered)
- [X] T034 [US1] Add endRound method to game.service.ts (determine winner as fastest correct, transition to 'results', broadcast ROUND_END with correct answer and winner)
- [X] T035 [US1] Add startRoundTimer method to game.service.ts (setTimeout for 180 seconds, auto-end round when timer expires)

### Socket.IO READY/ANSWER Handlers for User Story 1

- [X] T036 [US1] Create apps/backend/src/socket/game.handler.ts with handleReady function (validate participant in room, call game.service.handleReady)
- [X] T037 [US1] Add handleAnswer function to socket/game.handler.ts (validate participant in room, call game.service.handleAnswer)

### Socket.IO Integration for User Story 1

- [X] T038 [US1] Update apps/backend/src/socket/index.ts to register JOIN, LEAVE, READY, ANSWER event handlers with Socket.IO connection event
- [X] T039 [US1] Implement disconnect handler in socket/index.ts to call room.handler.handleDisconnect
- [X] T040 [US1] Add connection logging to socket/index.ts (log client ID, timestamp on connect/disconnect)

### Frontend Migration for User Story 1

- [X] T041 [US1] Install socket.io-client in apps/frontend/
- [X] T042 [US1] Create apps/frontend/lib/config.ts with API_CONFIG object (baseUrl, socketUrl from env vars)
- [X] T043 [US1] Update apps/frontend/lib/websocket.ts to use Socket.IO client instead of native WebSocket (replace WebSocket with io(), update event handlers)
- [X] T044 [US1] Update apps/frontend/lib/types.ts to add score, roundsWon fields to Participant interface
 - [X] T045 [US1] Remove frontend API routes; frontend now calls Express backend POST /api/room/create directly (no local proxy)
- [X] T046 [US1] Create apps/frontend/.env.local.example with NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SOCKET_URL

**Checkpoint**: At this point, User Story 1 should be fully functional. Test by creating room, joining with 2 players, playing through multiple rounds, testing disconnection/reconnection.

---

## Phase 4: User Story 2 - Score Tracking Across Rounds (Priority: P2)

**Goal**: Add cumulative score tracking where round winners earn 1 point, with live leaderboard display throughout game session

**Validation**: Play 3 rounds with 2-3 players where different players win each round. Verify winner receives +1 point each time, leaderboard updates after each round showing correct rankings, and overall winner has highest cumulative score. Test tie-breaking by having 2 players with equal scores and verifying most recent winner ranks higher.

### Score Tracking Backend for User Story 2

- [X] T047 [P] [US2] Update apps/backend/src/services/game.service.ts endRound method to increment winner's score by 1, increment roundsWon, set lastWinTimestamp
- [X] T048 [P] [US2] Add calculateLeaderboard method to game.service.ts (sort by score descending, tie-break by lastWinTimestamp descending, assign rankings)
- [X] T049 [US2] Update apps/backend/src/socket/room.handler.ts handleJoin to initialize new participants with score=0, roundsWon=0, lastWinTimestamp=null
- [X] T050 [US2] Update apps/backend/src/services/game.service.ts to include leaderboard in ROOM_STATE payload (call calculateLeaderboard)
- [X] T051 [US2] Update apps/backend/src/services/game.service.ts endRound to include leaderboard, winnerScore, scoreChange per participant in ROUND_END payload

### Score Display Frontend for User Story 2

- [X] T052 [P] [US2] Update apps/frontend/app/components/participant-card.tsx to display participant score next to name
- [X] T053 [P] [US2] Create apps/frontend/app/components/leaderboard.tsx component with sorted list of participants (rank, name, score, rounds won) using shadcn/ui Card
- [X] T054 [US2] Update apps/frontend/app/room/[code]/page.tsx to display leaderboard component in lobby and results states
- [X] T055 [US2] Update apps/frontend/app/components/round-results.tsx to show score changes (+1 for winner, 0 for others) and updated leaderboard
- [X] T056 [US2] Add responsive styling to leaderboard component for mobile (320px+), tablet (768px+), desktop (1024px+) using Tailwind

**Checkpoint**: At this point, User Story 2 should be independently functional. Test by playing multiple rounds and verifying scores accumulate correctly, leaderboard updates, and tie-breaking works.

---

## Phase 5: User Story 3 - Join Room via Shareable Link (Priority: P3)

**Goal**: Enable users to join rooms by clicking shareable URLs (e.g., /room/A3B7K9) instead of manually typing codes

**Validation**: Create a room, copy the shareable URL displayed, open it in a new browser tab or device, enter a name, and verify automatic entry into the correct room without typing the room code. Test with invalid room code in URL and verify appropriate error message.

### Backend Validation Endpoint for User Story 3

- [X] T057 [US3] Create apps/backend/src/routes/room.routes.ts GET /:code/validate endpoint (call room.service.validateRoomCode, return exists, canJoin, participantCount, gameState)
- [X] T058 [US3] Add error handling to /:code/validate for invalid codes (return 404 with exists:false if room not found)

### Frontend Dynamic Route for User Story 3

- [X] T059 [US3] Update apps/frontend/app/room/[code]/page.tsx to extract room code from URL params using Next.js dynamic route
- [X] T060 [US3] Add room validation call to apps/frontend/app/room/[code]/page.tsx on mount (fetch /api/room/:code/validate)
- [X] T061 [US3] Update apps/frontend/app/components/join-room-form.tsx to accept pre-filled room code prop and make field read-only if provided
- [X] T062 [US3] Add error state to apps/frontend/app/room/[code]/page.tsx for invalid room codes (show "Room not found", "Room full", or "Game in progress" message)
- [X] T063 [US3] Update apps/frontend/app/components/room-code-display.tsx to show shareable URL format (FRONTEND_BASE_URL/room/CODE)

### Frontend URL Handling for User Story 3

- [X] T064 [US3] Update apps/frontend/app/api/room/[code]/route.ts to proxy validation requests to Express backend
- [X] T065 [US3] Add case-insensitive room code handling to backend room.store.ts (normalize to uppercase on lookup)
- [X] T066 [US3] Add responsive design for error messages on mobile, tablet, desktop using Tailwind utilities

**Checkpoint**: At this point, User Story 3 should be independently functional. Test by creating room, copying shareable URL, opening in new tab, and joining without typing code. Test invalid URLs.

---

## Phase 6: User Story 4 - Share Room Link Button (Priority: P4)

**Goal**: Add a "Share Link" button that copies room URL to clipboard (desktop) or opens native share dialog (mobile)

**Validation**: Create a room, click "Share Link" button on desktop and verify "Link copied!" message appears and correct URL is in clipboard. On mobile device, verify native share dialog opens with room URL pre-filled. Test on browser without clipboard API and verify fallback URL display.

### Share Button Component for User Story 4

- [X] T067 [P] [US4] Create apps/frontend/app/components/share-button.tsx with "Share Link" button using shadcn/ui Button component
- [X] T068 [US4] Add clipboard API copy functionality to share-button.tsx (navigator.clipboard.writeText with shareable URL)
- [X] T069 [US4] Add native share API for mobile to share-button.tsx (navigator.share with URL, title, text if supported)
- [X] T070 [US4] Add success feedback toast/message to share-button.tsx ("Link copied!" for 2 seconds after successful copy)
- [X] T071 [US4] Add fallback display to share-button.tsx for browsers without clipboard/share API (show URL in read-only input)
- [X] T072 [US4] Add error handling to share-button.tsx for failed copy operations (show error message)

### Share Button Integration for User Story 4

- [X] T073 [US4] Add share-button component to apps/frontend/app/components/room-lobby.tsx below room code display
- [X] T074 [US4] Pass shareable URL prop from room-lobby to share-button (construct from FRONTEND_BASE_URL + room code)
- [X] T075 [US4] Add responsive styling to share-button for mobile (full width), tablet (auto width), desktop (auto width) using Tailwind
- [X] T076 [US4] Add accessibility attributes to share-button (aria-label, keyboard navigation support)

**Checkpoint**: All user stories should now be independently functional. Test complete flow: create room, share link, join via link, play game with scores, use share button.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final cleanup

 [X] T077 [P] Add error handling for server restart scenario (detect disconnection, show "Session lost" modal, redirect to homepage)
 [X] T078 [P] Update apps/frontend/app/error.tsx to handle room-related errors with user-friendly messages
 [X] T079 [P] Update apps/frontend/app/global-error.tsx for session-lost error handling
 [X] T080 Add rate limiting to apps/backend/src/routes/room.routes.ts to prevent room creation spam
 [X] T081 Add connection logging to apps/backend/src/socket/index.ts for debugging (log JOIN, READY, ANSWER, LEAVE events)
 [X] T082 Add performance monitoring logs to apps/backend/src/services/game.service.ts (log round duration, answer processing time)
 [X] T083 Update root README.md with Express backend setup instructions (link to quickstart.md)
 [X] T084 Update DEPLOYMENT.md with Express backend deployment instructions (port 3001, environment variables)
 [X] T085 Delete workers/ directory and Wrangler configuration files (wrangler.toml, worker-configuration.d.ts)
 [X] T086 Update apps/frontend/README.md to reference new Express backend instead of Cloudflare Workers
- [X] T087 Run quickstart.md validation procedures (create room, validate, join via Socket.IO, play game, test reconnection)
- [X] T088 Code cleanup: Remove unused imports, format with prettier, verify no TypeScript `any` types
- [X] T089 Verify all components responsive on mobile (320px+), tablet (768px+), desktop (1024px+)
- [X] T090 Verify clean code standards: clear function names, proper separation of concerns, TypeScript strict mode compliance

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start after Foundational ✅ Independent
  - US2 (Phase 4): Depends on US1 (needs scoring fields in payloads)
  - US3 (Phase 5): Can start after Foundational ✅ Independent (only needs room validation)
  - US4 (Phase 6): Depends on US3 (needs shareable URL to exist)
- **Polish (Phase 7)**: Depends on desired user stories being complete

### User Story Dependencies

- **US1 (P1 - Backend Migration)**: FOUNDATIONAL - Required for US2
  - Blocks: US2 (US2 extends US1's game flow with scores)
  - Independent from: US3, US4
  
- **US2 (P2 - Score Tracking)**: Depends on US1
  - Extends US1's ROUND_END and ROOM_STATE messages with score data
  - Independent from: US3, US4
  
- **US3 (P3 - Shareable Links)**: FOUNDATIONAL - Required for US4
  - Blocks: US4 (US4 shares the URLs created by US3)
  - Independent from: US1, US2 (only needs room validation endpoint)
  
- **US4 (P4 - Share Button)**: Depends on US3
  - Uses shareable URLs created in US3
  - Independent from: US1, US2

### Critical Path for MVP

```
Setup (Phase 1)
  ↓
Foundational (Phase 2) ← MUST COMPLETE
  ↓
US1 - Backend Migration (Phase 3) ← MVP MILESTONE
  ↓
US2 - Score Tracking (Phase 4) ← OPTIONAL: Can deploy after US1 if desired
  ↓
US3 - Shareable Links (Phase 5) ← OPTIONAL: Can develop in parallel with US2
  ↓
US4 - Share Button (Phase 6) ← OPTIONAL: Quick enhancement after US3
  ↓
Polish (Phase 7)
```

### Parallel Opportunities

**Phase 1 (Setup)**: Tasks T007, T008, T009 can run in parallel (different type files)

**Phase 2 (Foundational)**: Tasks T011, T012, T013 can run in parallel (independent utilities)

**Phase 3 (US1)**: 
- T020, T021 (routes) can run in parallel (different route files)
- T028, T036 (handlers) can run after services are ready

**Phase 4 (US2)**:
- T047, T048 (backend) and T052, T053 (frontend) can run in parallel (backend/frontend split)

**Phase 6 (US4)**:
- T067, T068, T069, T070, T071, T072 can run in parallel (building share button features)

**Phase 7 (Polish)**:
- T077, T078, T079 (error handling) can run in parallel
- T083, T084, T086 (documentation) can run in parallel

---

## Parallel Example: User Story 1 (Backend Migration)

```bash
# After Foundational phase completes, launch in parallel:

# Backend routes (different files):
Task T020: Create POST /create endpoint in room.routes.ts
Task T021: Create GET /health endpoint in health.routes.ts

# Wait for room.service.ts foundation, then parallel services:
Task T031: Implement startGame in game.service.ts
Task T028: Implement handleJoin in room.handler.ts

# Frontend migration (separate from backend):
Task T041: Install socket.io-client
Task T042: Create config.ts
Task T043: Update websocket.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only - Recommended)

1. Complete **Phase 1**: Setup (T001-T010) → Backend workspace ready
2. Complete **Phase 2**: Foundational (T011-T019) → Core infrastructure ready
3. Complete **Phase 3**: User Story 1 (T020-T046) → Full backend migration done
4. **STOP and VALIDATE**: Run quickstart.md validation (create room, join, play game, test reconnection)
5. **Deploy/Demo MVP**: Backend migration complete with zero regression

### Incremental Delivery (Recommended Path)

1. **Setup + Foundational** (T001-T019) → Foundation ready
2. **Add US1** (T020-T046) → Manually test → Deploy/Demo ✅ **MVP DEPLOYED**
3. **Add US2** (T047-T056) → Manually test scores → Deploy/Demo ✅ **Competitive gameplay added**
4. **Add US3** (T057-T066) → Manually test shareable links → Deploy/Demo ✅ **Easy joining added**
5. **Add US4** (T067-T076) → Manually test share button → Deploy/Demo ✅ **Sharing convenience added**
6. **Polish** (T077-T090) → Final cleanup → Deploy ✅ **Production ready**

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With multiple developers (after Foundational Phase 2 completes):

1. **Team completes Setup + Foundational together** (T001-T019)
2. **Once Foundational done:**
   - **Developer A**: US1 - Backend Migration (T020-T046) ← PRIORITY
   - **Developer B**: US3 - Shareable Links (T057-T066) ← Can start immediately (independent)
3. **After US1 completes:**
   - **Developer A**: US2 - Score Tracking (T047-T056) ← Depends on US1
   - **Developer B**: Continues US3 or helps with US2
4. **After US3 completes:**
   - **Any developer**: US4 - Share Button (T067-T076) ← Quick enhancement
5. **Team polishes together** (T077-T090)

**Note**: US1 MUST complete before US2. US3 can proceed in parallel with US1.

---

## Task Summary

- **Total Tasks**: 90
- **Setup**: 10 tasks (T001-T010)
- **Foundational**: 9 tasks (T011-T019) ← BLOCKS all user stories
- **US1 - Backend Migration**: 27 tasks (T020-T046) ← MVP
- **US2 - Score Tracking**: 10 tasks (T047-T056)
- **US3 - Shareable Links**: 10 tasks (T057-T066)
- **US4 - Share Button**: 10 tasks (T067-T076)
- **Polish**: 14 tasks (T077-T090)

**Parallel Opportunities**: 15 tasks marked [P] can run in parallel when their phase begins

**Independent Stories**:
- US1 (Backend Migration) - Foundational for US2
- US3 (Shareable Links) - Independent, can run parallel with US1/US2
- US4 (Share Button) - Depends only on US3

**Suggested MVP**: Complete through US1 (T001-T046) = 46 tasks for full backend migration

---

## Manual Testing Checklist (Per Quickstart.md)

### After US1 (Backend Migration)
- [ ] Create room via HTTP POST /api/room/create → Verify room code returned
- [ ] Validate room via GET /api/room/:code/validate → Verify exists=true
- [ ] Join room with 2 players via Socket.IO JOIN → Verify both see PLAYER_JOINED
- [ ] Ready up both players → Verify PLAYER_READY broadcast and 15-second countdown
- [ ] Wait for GAME_START → Verify question displayed and 3-minute timer starts
- [ ] Submit answers via ANSWER → Verify ANSWER_SUBMITTED and ANSWER_COUNT_UPDATE
- [ ] Wait for ROUND_END → Verify correct answer shown and winner identified
- [ ] Ready up for next round → Verify new round starts with different question
- [ ] Disconnect one player → Reconnect within 30 seconds → Verify state restored
- [ ] Test on mobile (320px), tablet (768px), desktop (1024px+) → Verify responsive

### After US2 (Score Tracking)
- [ ] Play 3 rounds with 2-3 players → Verify winner gets +1 point each time
- [ ] Check leaderboard after each round → Verify correct rankings by score
- [ ] Create tie scenario (2 players with equal scores) → Verify recency tie-breaking
- [ ] Mid-session join → Verify new player starts at 0 points, existing scores retained

### After US3 (Shareable Links)
- [ ] Create room → Copy shareable URL displayed
- [ ] Open URL in new tab → Verify room code pre-filled, only name entry needed
- [ ] Visit invalid room URL → Verify error message displayed
- [ ] Join via URL while game active → Verify "Game in progress" error

### After US4 (Share Button)
- [ ] Click "Share Link" on desktop → Verify "Link copied!" message
- [ ] Paste clipboard → Verify correct shareable URL
- [ ] Click "Share Link" on mobile → Verify native share dialog opens
- [ ] Test on browser without clipboard API → Verify fallback URL display

### Final Polish Validation
- [ ] Restart Express server during active game → Verify "Session lost" error and redirect
- [ ] Create 100 rooms → Verify 101st creation returns ROOM_LIMIT_REACHED error
- [ ] Leave all players from room → Wait 5 minutes → Verify room auto-deleted
- [ ] Run health check GET /health → Verify status, uptime, room count returned
- [ ] Verify no TypeScript errors: `npm run build` in apps/backend
- [ ] Verify no console errors in browser DevTools during full game flow

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **Constitution compliance**: No testing infrastructure per project rules - quality assured through manual testing
- **Commit strategy**: Commit after each task or logical group
- **Validation**: Stop at any checkpoint to manually validate story functionality per quickstart.md
- **MVP Definition**: US1 (Backend Migration) provides full feature parity with Cloudflare Durable Objects
- **Deployment**: Backend runs on port 3001, frontend on port 3000, both required for full functionality
