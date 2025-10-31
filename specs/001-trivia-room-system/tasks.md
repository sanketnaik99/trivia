# Tasks: Trivia Room System

**Input**: Design documents from `/specs/001-trivia-room-system/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Per project constitution, this project does NOT include testing infrastructure. Quality assurance is performed through code review and manual testing.

**Organization**: Tasks are grouped by user story to enable independent implementation of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: Next.js App Router structure at repository root (`app/`, `components/`, `lib/`)
- **Backend**: Cloudflare Workers in `workers/` directory
- **Configuration**: Root-level config files (`tsconfig.json`, `tailwind.config.ts`, `wrangler.toml`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for Next.js + Cloudflare Workers

- [x] T001 Initialize Next.js 16.0.1 project with TypeScript and App Router at repository root
- [x] T002 Install core dependencies: react@19.2.0, next@16.0.1, typescript@5+, tailwindcss@4
- [x] T003 [P] Configure TypeScript with strict mode in tsconfig.json
- [x] T004 [P] Configure ESLint per constitution (no testing rules) in eslint.config.mjs
- [x] T005 [P] Setup Tailwind CSS 4 configuration with responsive breakpoints (320px, 768px, 1024px) in tailwind.config.ts
- [x] T006 [P] Initialize shadcn/ui and install core components (Button, Input, Card, Badge)
- [x] T007 [P] Create workers/ directory and initialize Cloudflare Workers project
- [x] T008 [P] Configure wrangler.toml for Durable Objects with RoomDurableObject binding
- [x] T009 [P] Setup environment variables in .env.local (NEXT_PUBLIC_WS_URL, NEXT_PUBLIC_API_URL)
- [x] T010 Create .gitignore to exclude node_modules, .env.local, .next, .wrangler

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T011 Create app/layout.tsx with root layout, metadata, and global Tailwind imports
- [x] T012 [P] Configure app/globals.css with Tailwind directives and custom CSS variables for theme
- [x] T013 [P] Create app/page.tsx as home page with placeholder for create/join forms
- [x] T014 [P] Create app/lib/utils.ts with cn() utility for className merging
- [x] T015 [P] Create components/ui/ directory and add shadcn/ui components (button.tsx, input.tsx, card.tsx, badge.tsx)
- [x] T016 Create app/lib/types.ts with TypeScript types for Room, Participant, Question, Round, GameState, ConnectionStatus
- [x] T017 Create app/lib/questions.ts with hardcoded array of 10 trivia questions (typed answer format with correctAnswer and acceptedAnswers)
- [x] T018 [P] Create app/lib/websocket.ts with WebSocket client wrapper (connection, reconnection logic, message handlers)
- [x] T019 [P] Create app/lib/room-state.ts with utility functions for room state management and answer normalization
- [x] T020 Create workers/room-durable-object.ts with base Durable Object class structure and WebSocket upgrade handler
- [x] T021 Create workers/types.ts with TypeScript types for WebSocket message protocol (ClientMessage, ServerMessage unions)
- [x] T022 Create app/room/[code]/page.tsx as room page with dynamic route parameter
- [x] T023 [P] Create app/components/loading.tsx with loading spinner component
- [x] T024 [P] Create app/components/error-display.tsx with error message component

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create and Join Rooms (Priority: P1) 🎯 MVP

**Goal**: Users can create new rooms and join existing rooms using room codes. Players can see each other in real-time.

**Validation**: 
1. Open app, enter name "Alice", click "Create Room" → See 6-character room code
2. Copy room code, open app in incognito/different browser
3. Enter name "Bob", paste room code, click "Join Room" → Both see each other in participant list
4. Add a third user "Charlie" → All three see updated participant list in real-time

### HTTP API Endpoints for User Story 1

- [ ] T025 [P] [US1] Create app/api/room/create/route.ts - POST endpoint to create room with Durable Object stub creation
- [ ] T026 [P] [US1] Create app/api/room/[code]/route.ts - GET endpoint to validate room exists via Durable Object
- [ ] T027 [P] [US1] Create app/api/room/[code]/join/route.ts - POST endpoint to join room with name uniqueness check

### Durable Object Implementation for User Story 1

- [ ] T028 [US1] Implement room creation logic in workers/room-durable-object.ts (generateRoomCode function, initialize state)
- [ ] T029 [US1] Implement room validation logic in workers/room-durable-object.ts (check room exists, return metadata)
- [ ] T030 [US1] Implement join room logic in workers/room-durable-object.ts (validate capacity, check duplicate names, add participant)
- [ ] T031 [US1] Implement WebSocket connection handling in workers/room-durable-object.ts (upgrade, session management, broadcast)
- [ ] T032 [US1] Implement JOIN message handler in workers/room-durable-object.ts (add participant, broadcast PLAYER_JOINED)
- [ ] T033 [US1] Implement LEAVE message handler in workers/room-durable-object.ts (remove participant, broadcast PLAYER_LEFT, cleanup)
- [ ] T034 [US1] Implement ROOM_STATE broadcast in workers/room-durable-object.ts (send full state on connection)

### UI Components for User Story 1

- [ ] T035 [P] [US1] Create app/components/create-room-form.tsx with name input and create button
- [ ] T036 [P] [US1] Create app/components/join-room-form.tsx with name input, room code input, and join button
- [ ] T037 [P] [US1] Create app/components/room-lobby.tsx with participant list display and ready status
- [ ] T038 [P] [US1] Create app/components/participant-card.tsx with participant name, ready badge, and "You" indicator
- [ ] T039 [P] [US1] Create app/components/room-code-display.tsx with large room code and copy button

### Integration for User Story 1

- [ ] T040 [US1] Update app/page.tsx to render CreateRoomForm and JoinRoomForm side-by-side (responsive grid)
- [ ] T041 [US1] Implement create room flow in app/page.tsx (API call, navigate to /room/[code])
- [ ] T042 [US1] Implement join room flow in app/page.tsx (validate code, API call, navigate to /room/[code])
- [ ] T043 [US1] Update app/room/[code]/page.tsx to establish WebSocket connection using app/lib/websocket.ts
- [ ] T044 [US1] Update app/room/[code]/page.tsx to send JOIN message on connection
- [ ] T045 [US1] Update app/room/[code]/page.tsx to render RoomLobby with participants from ROOM_STATE
- [ ] T046 [US1] Implement real-time participant updates (PLAYER_JOINED, PLAYER_LEFT) in app/room/[code]/page.tsx
- [ ] T047 [US1] Add responsive design for mobile (320px+), tablet (768px+), desktop (1024px+) to all US1 components
- [ ] T048 [US1] Add error handling for invalid room codes, network errors, and connection failures
- [ ] T049 [US1] Verify clean code standards: component organization, TypeScript types, no unused code

**Checkpoint**: User Story 1 complete - Users can create/join rooms and see participants in real-time

---

## Phase 4: User Story 2 - Ready Up and Start Game (Priority: P2)

**Goal**: Players in lobby can mark themselves as ready. When all are ready, game auto-starts with first question.

**Validation**:
1. Have 2+ users in a room (from US1)
2. First user clicks "Ready" → See status change to green/ready for all users
3. Second user clicks "Ready" → Game automatically starts within 3 seconds
4. All users see the same question simultaneously

### Durable Object Implementation for User Story 2

- [ ] T050 [P] [US2] Implement READY message handler in workers/room-durable-object.ts (toggle ready status)
- [ ] T051 [US2] Implement ready state broadcast in workers/room-durable-object.ts (PLAYER_READY message to all)
- [ ] T052 [US2] Implement auto-start game logic in workers/room-durable-object.ts (check all ready, select question, create round)
- [ ] T053 [US2] Implement GAME_START broadcast in workers/room-durable-object.ts (send question without answers, startTime, duration)
- [ ] T054 [US2] Implement question selection logic in workers/room-durable-object.ts (random unused question from 10 hardcoded)

### UI Components for User Story 2

- [ ] T055 [P] [US2] Update app/components/room-lobby.tsx to add Ready/Unready button for each participant
- [ ] T056 [P] [US2] Update app/components/participant-card.tsx to show ready status badge (green/gray)
- [ ] T057 [P] [US2] Create app/components/game-countdown.tsx with 3-2-1 countdown animation before question appears

### Integration for User Story 2

- [ ] T058 [US2] Update app/room/[code]/page.tsx to send READY message when user clicks ready button
- [ ] T059 [US2] Update app/room/[code]/page.tsx to handle PLAYER_READY updates and re-render lobby
- [ ] T060 [US2] Update app/room/[code]/page.tsx to handle GAME_START message and transition to game view
- [ ] T061 [US2] Add responsive design verification for ready buttons (44x44px touch targets on mobile)
- [ ] T062 [US2] Add visual feedback for ready status changes (smooth transitions, color changes)
- [ ] T063 [US2] Verify clean code standards: clear state management, no prop drilling

**Checkpoint**: User Story 2 complete - Players can ready up and game auto-starts

---

## Phase 5: User Story 3 - Answer Questions with Timer (Priority: P3)

**Goal**: During active game, all players see same question with 3-minute timer. Players submit typed answers and wait for others or time to expire.

**Validation**:
1. Start game with 2+ ready players
2. Verify all see same question text and countdown starting at 3:00
3. First user types answer "Paris" and submits → See "Waiting for others..." with "1/2 answered"
4. Second user submits answer → Question ends immediately
5. Alternative: Wait for full 3 minutes without answering → Question auto-ends

### Durable Object Implementation for User Story 3

- [ ] T064 [P] [US3] Implement ANSWER message handler in workers/room-durable-object.ts (validate, store answerText and timestamp)
- [ ] T065 [US3] Implement ANSWER_SUBMITTED confirmation in workers/room-durable-object.ts (send to submitter)
- [ ] T066 [US3] Implement ANSWER_COUNT_UPDATE broadcast in workers/room-durable-object.ts (answeredCount/totalCount)
- [ ] T067 [US3] Implement timer logic in workers/room-durable-object.ts (3-minute server-side timer, auto-end round)
- [ ] T068 [US3] Implement round end detection in workers/room-durable-object.ts (all answered OR timer expired)

### UI Components for User Story 3

- [ ] T069 [P] [US3] Create app/components/game-question.tsx with question text, text input field, and submit button
- [ ] T070 [P] [US3] Create app/components/game-timer.tsx with countdown display (MM:SS format) and progress bar
- [ ] T071 [P] [US3] Create app/components/waiting-state.tsx with "Waiting for others" message and answer progress
- [ ] T072 [P] [US3] Update app/components/game-question.tsx to disable input after submission

### Integration for User Story 3

- [ ] T073 [US3] Update app/room/[code]/page.tsx to render game view when gameState is "active"
- [ ] T074 [US3] Update app/room/[code]/page.tsx to initialize client-side countdown from GAME_START (startTime, duration)
- [ ] T075 [US3] Update app/room/[code]/page.tsx to send ANSWER message with answerText and timestamp
- [ ] T076 [US3] Update app/room/[code]/page.tsx to handle ANSWER_SUBMITTED and show waiting state
- [ ] T077 [US3] Update app/room/[code]/page.tsx to handle ANSWER_COUNT_UPDATE and display progress
- [ ] T078 [US3] Implement client-side timer sync in app/lib/room-state.ts (calculate from server startTime)
- [ ] T079 [US3] Add responsive design for question display (large text on desktop, readable on mobile)
- [ ] T080 [US3] Add visual feedback for answer submission (loading state, success confirmation)
- [ ] T081 [US3] Verify clean code standards: no magic numbers, clear timer logic

**Checkpoint**: User Story 3 complete - Players can answer questions with synchronized timer

---

## Phase 6: User Story 4 - Determine Round Winner (Priority: P4)

**Goal**: After round ends, show correct answer, determine winner (fastest correct), display results to all players.

**Validation**:
1. Complete a question round with mixed answers (some correct, some wrong, some unanswered)
2. Verify correct answer is displayed prominently
3. Verify winner is the player with fastest correct answer (or "No Winner" if none correct)
4. Verify each player sees their own answer marked as correct/incorrect with time

### Durable Object Implementation for User Story 4

- [ ] T082 [US4] Implement winner calculation in workers/room-durable-object.ts (normalize answers, find fastest correct)
- [ ] T083 [US4] Implement answer normalization in workers/room-durable-object.ts (lowercase, trim, check acceptedAnswers)
- [ ] T084 [US4] Implement ROUND_END broadcast in workers/room-durable-object.ts (correctAnswer, acceptedAnswers, winnerId, results)
- [ ] T085 [US4] Update room state to "results" after round ends in workers/room-durable-object.ts

### UI Components for User Story 4

- [ ] T086 [P] [US4] Create app/components/round-results.tsx with correct answer display and winner announcement
- [ ] T087 [P] [US4] Create app/components/player-result-card.tsx showing participant answer, time, correct/incorrect indicator
- [ ] T088 [P] [US4] Create app/components/winner-banner.tsx with prominent winner display or "No Winner This Round"

### Integration for User Story 4

- [ ] T089 [US4] Update app/room/[code]/page.tsx to handle ROUND_END message and transition to results view
- [ ] T090 [US4] Update app/room/[code]/page.tsx to render RoundResults when gameState is "results"
- [ ] T091 [US4] Display all player results sorted by correctness, then speed in app/components/round-results.tsx
- [ ] T092 [US4] Highlight current user's result in app/components/player-result-card.tsx
- [ ] T093 [US4] Add responsive design for results screen (stack on mobile, grid on desktop)
- [ ] T094 [US4] Add visual celebrations for winner (confetti animation, color highlight)
- [ ] T095 [US4] Verify clean code standards: clear winner calculation logic, no complex conditionals

**Checkpoint**: User Story 4 complete - Round winners are correctly determined and displayed

---

## Phase 7: User Story 5 - Continue or End Game (Priority: P5)

**Goal**: After viewing results, players can ready up for next round (new question) or leave room. Room persists until all leave.

**Validation**:
1. Complete one round and view results
2. All players click "Ready for Next Round" → New different question appears
3. One player clicks "Leave Room" → They return to home, others see updated participant list
4. Last player leaves → Room closes and code becomes invalid

### Durable Object Implementation for User Story 5

- [ ] T096 [P] [US5] Update READY handler in workers/room-durable-object.ts to work in "results" state
- [ ] T097 [US5] Implement next round logic in workers/room-durable-object.ts (select new unused question, reset ready states)
- [ ] T098 [US5] Implement room cleanup in workers/room-durable-object.ts (delete when all players leave)
- [ ] T099 [US5] Add question tracking in workers/room-durable-object.ts (track used question IDs, avoid repeats)

### UI Components for User Story 5

- [ ] T100 [P] [US5] Update app/components/round-results.tsx to add "Ready for Next Round" button
- [ ] T101 [P] [US5] Update app/components/room-lobby.tsx to add "Leave Room" button
- [ ] T102 [P] [US5] Create app/components/leave-confirmation.tsx with confirmation dialog before leaving

### Integration for User Story 5

- [ ] T103 [US5] Update app/room/[code]/page.tsx to handle ready up from results state (transition to lobby)
- [ ] T104 [US5] Update app/room/[code]/page.tsx to handle leave room action (send LEAVE, navigate to home)
- [ ] T105 [US5] Update app/room/[code]/page.tsx to handle PLAYER_LEFT updates (remove from participant list)
- [ ] T106 [US5] Add navigation logic to return to home page after leaving in app/room/[code]/page.tsx
- [ ] T107 [US5] Implement room cleanup detection (all players gone) in workers/room-durable-object.ts
- [ ] T108 [US5] Add responsive design for continue/leave buttons (full width on mobile, inline on desktop)
- [ ] T109 [US5] Verify clean code standards: clear navigation flow, proper cleanup

**Checkpoint**: User Story 5 complete - Players can play multiple rounds or leave gracefully

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final quality checks

- [ ] T110 [P] Add reconnection logic in app/lib/websocket.ts (exponential backoff, max 5 attempts)
- [ ] T111 [P] Add connection status indicator in app/room/[code]/page.tsx (connected/reconnecting/disconnected)
- [ ] T112 [P] Implement error boundaries in app/layout.tsx for graceful error handling
- [ ] T113 [P] Add loading states for all async operations (create room, join room, WebSocket connect)
- [ ] T114 [P] Optimize bundle size: verify tree-shaking, remove unused imports
- [ ] T115 [P] Add page metadata (titles, descriptions) to all pages for SEO
- [ ] T116 [P] Verify responsive design on real devices (iOS Safari, Android Chrome, tablets)
- [ ] T117 [P] Add smooth transitions and animations (page transitions, state changes)
- [ ] T118 [P] Implement proper focus management for accessibility (keyboard navigation)
- [ ] T119 [P] Add proper ARIA labels to all interactive elements
- [ ] T120 Code review all components for clean code principles (DRY, SOLID, clear naming)
- [ ] T121 Verify all TypeScript types are explicit (no implicit any)
- [ ] T122 Run ESLint and fix all warnings across codebase
- [ ] T123 Verify constitution compliance: no testing infrastructure, Next.js/Tailwind/shadcn used
- [ ] T124 Manual testing following quickstart.md validation workflows
- [ ] T125 Performance audit: verify <3s page load, <2s real-time latency
- [ ] T126 Create README.md with setup instructions, tech stack, and project structure
- [ ] T127 Add deployment documentation for Vercel (Next.js) and Cloudflare (Workers)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Create/Join): Can start after Phase 2 ✅
  - US2 (Ready/Start): Depends on US1 (needs lobby) ⚠️
  - US3 (Answer): Depends on US2 (needs game start) ⚠️
  - US4 (Results): Depends on US3 (needs answers) ⚠️
  - US5 (Continue): Depends on US4 (needs results) ⚠️
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

**Sequential Flow** (recommended for MVP):
1. **Phase 1 → Phase 2** (Foundation) ✅
2. **Phase 2 → Phase 3** (US1: Create/Join Rooms) ✅
3. **Phase 3 → Phase 4** (US2: Ready Up) - needs lobby from US1
4. **Phase 4 → Phase 5** (US3: Answer Questions) - needs game start from US2
5. **Phase 5 → Phase 6** (US4: Round Winner) - needs answers from US3
6. **Phase 6 → Phase 7** (US5: Continue) - needs results from US4
7. **All stories → Phase 8** (Polish)

**Parallel Opportunities**:
- All tasks within Phase 1 marked [P] can run in parallel
- All tasks within Phase 2 marked [P] can run in parallel
- Within each user story phase:
  - HTTP API endpoints can be built in parallel
  - UI components marked [P] can be built in parallel
  - Durable Object handlers can be partially parallelized
- Different developers can work on different user stories sequentially once Phase 2 completes

### Within Each User Story

1. **API Endpoints** (parallel) → Provides data layer
2. **Durable Object Logic** (sequential) → Provides business logic
3. **UI Components** (parallel) → Provides presentation layer
4. **Integration** (sequential) → Connects everything
5. **Responsive Design** → Refinement
6. **Clean Code Review** → Final validation

---

## Parallel Example: User Story 1

```bash
# After Phase 2 completes, launch all US1 API endpoints in parallel:
T025: "Create app/api/room/create/route.ts"
T026: "Create app/api/room/[code]/route.ts"
T027: "Create app/api/room/[code]/join/route.ts"

# Then build Durable Object logic sequentially:
T028: "Implement room creation logic"
T029: "Implement room validation logic"
# ... etc

# Meanwhile, launch all US1 UI components in parallel:
T035: "Create app/components/create-room-form.tsx"
T036: "Create app/components/join-room-form.tsx"
T037: "Create app/components/room-lobby.tsx"
T038: "Create app/components/participant-card.tsx"
T039: "Create app/components/room-code-display.tsx"

# Finally, integrate everything sequentially:
T040-T049: Integration tasks
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T010)
2. Complete Phase 2: Foundational (T011-T024) - **CRITICAL CHECKPOINT**
3. Complete Phase 3: User Story 1 (T025-T049)
4. **STOP and VALIDATE**: 
   - Create room → Get code
   - Join room in different browser → See both users
   - Add third user → All see updates in real-time
5. Deploy to staging and demo

**Value**: Users can gather in rooms for trivia (foundational social feature)

### Incremental Delivery (Recommended)

1. **Setup + Foundational** → Foundation ready (T001-T024)
2. **Add US1** → Can create/join rooms → Deploy MVP ✅
3. **Add US2** → Can ready up and start → Deploy v2 🎯
4. **Add US3** → Can answer questions → Deploy v3 🎮
5. **Add US4** → Can see winners → Deploy v4 🏆
6. **Add US5** → Can continue/leave → Deploy v5 🔄
7. **Polish** → Production ready → Deploy v1.0 🚀

Each deployment adds value without breaking previous features.

### Parallel Team Strategy

With 3 developers after Phase 2 completes:

**Week 1-2**: All complete Phase 1 + Phase 2 together
**Week 3**: 
- Dev A: Phase 3 (US1) - 25 tasks
- Dev B: Help with US1, prepare for US2
- Dev C: Polish work on Phase 2 components

**Week 4**:
- Dev A: Phase 4 (US2) - 14 tasks
- Dev B: Phase 5 (US3) - 18 tasks (can start if US2 interfaces defined)
- Dev C: Code review and responsive design

**Week 5**:
- Dev A: Phase 6 (US4) - 14 tasks
- Dev B: Phase 7 (US5) - 14 tasks (can start if US4 interfaces defined)
- Dev C: Phase 8 (Polish) - 18 tasks

---

## Task Summary

**Total Tasks**: 127

**By Phase**:
- Phase 1 (Setup): 10 tasks
- Phase 2 (Foundational): 14 tasks ⚠️ BLOCKS ALL STORIES
- Phase 3 (US1 - Create/Join): 25 tasks 🎯 MVP
- Phase 4 (US2 - Ready/Start): 14 tasks
- Phase 5 (US3 - Answer): 18 tasks
- Phase 6 (US4 - Results): 14 tasks
- Phase 7 (US5 - Continue): 14 tasks
- Phase 8 (Polish): 18 tasks

**Parallel Opportunities**: 47 tasks marked [P] can run in parallel within their phase

**Critical Path**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8

**MVP Scope** (Recommended first deployment):
- Phases 1-3 only (49 tasks)
- Delivers: Create/join rooms, see participants in real-time
- Estimated: 1-2 weeks for solo developer, 3-5 days for small team

**Full Feature**:
- All 8 phases (127 tasks)
- Delivers: Complete trivia game with all 5 user stories
- Estimated: 4-6 weeks for solo developer, 2-3 weeks for 3-person team

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable via manual validation
- Per constitution: No testing infrastructure - quality assured through code review and manual testing
- Cloudflare Workers and Next.js are separate deployments - can be tested independently
- WebSocket protocol must match between client (app/lib/websocket.ts) and server (workers/room-durable-object.ts)
- All 10 hardcoded questions defined in app/lib/questions.ts with typed answer format
- Answer normalization critical for US4 (lowercase, trim, check acceptedAnswers array)
- Timer synchronization uses server startTime as source of truth (clients calculate locally)
