# Tasks: Game Stability and Customization Improvements

**Input**: Design documents from `/specs/004-game-stability-improvements/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Per project constitution, this project does NOT include testing infrastructure. Quality assurance is performed through code review and manual testing.

**Organization**: Tasks are grouped by user story to enable independent implementation of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a Turborepo monorepo with:
- **Backend**: `apps/backend/src/`
- **Frontend**: `apps/frontend/app/` and `apps/frontend/components/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Verify development environment setup (Node.js 18+, PostgreSQL running)
- [ ] T002 Create feature branch 004-game-stability-improvements
- [ ] T003 [P] Check Question schema for category field in apps/backend/prisma/schema.prisma
- [ ] T004 [P] Install any missing dependencies (verify package.json in both apps)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend Type Definitions

- [X] T005 [P] Create ParticipantRole and ConnectionStatus types in apps/backend/src/types/room.types.ts
- [X] T006 [P] Create FeedbackMode type in apps/backend/src/types/room.types.ts
- [X] T007 [P] Create VoteState interface in apps/backend/src/types/game.types.ts
- [X] T008 Update Participant interface with role and connectionStatus fields in apps/backend/src/types/room.types.ts
- [X] T009 Update Room interface with selectedCategory, feedbackMode, voteState, cleanupTimer, maxActivePlayers in apps/backend/src/types/room.types.ts

### Database Migration (if needed)

- [ ] T010 If Question.category missing, create Prisma migration to add category field in apps/backend/prisma/schema.prisma
- [ ] T011 If migration created, run prisma migrate dev and populate existing questions with default category

### Backend Room Store

- [ ] T012 Update room initialization in apps/backend/src/store/room.store.ts to include new fields (selectedCategory, feedbackMode, voteState, cleanupTimer, maxActivePlayers: 16)
 
- [X] T012 Update room initialization in apps/backend/src/store/room.store.ts to include new fields (selectedCategory, feedbackMode, voteState, cleanupTimer, maxActivePlayers: 16)

### Frontend Type Definitions

- [X] T013 [P] Mirror backend types in apps/frontend/types/room.ts (ParticipantRole, ConnectionStatus, VoteState)
- [X] T014 [P] Update Room and Participant interfaces in apps/frontend/types/room.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Graceful Player Disconnection Handling (Priority: P1) 🎯 MVP

**Goal**: Allow games to continue when players disconnect, excluding disconnected players from round completion checks while preserving their data

**Validation**: 
1. Start game with 3 players
2. Have one player close browser mid-round
3. Verify remaining 2 players see disconnection notification
4. Verify round completes when remaining 2 players answer (doesn't wait for disconnected player)
5. Verify disconnected player's score/data preserved

### Backend Implementation for US1

- [X] T015 [P] [US1] Modify disconnect handler in apps/backend/src/socket/index.ts to set connectionStatus='disconnected' instead of removing participant
- [X] T016 [P] [US1] Add PARTICIPANT_LEFT broadcast with connectionStatus field in disconnect handler
- [X] T017 [P] [US1] Implement 5-minute cleanup timer in apps/backend/src/store/room.store.ts when room becomes empty
- [X] T018 [US1] Modify checkRoundCompletion in apps/backend/src/services/game.service.ts to exclude disconnected players
- [X] T019 [US1] Update round results generation in apps/backend/src/services/game.service.ts to only include connected active players
- [X] T020 [US1] Add cleanup timer cancellation logic in apps/backend/src/socket/room.handler.ts on reconnection

### Frontend Implementation for US1

- [X] T021 [P] [US1] Create ConnectionStatus component in apps/frontend/app/room/[code]/components/ConnectionStatus.tsx
- [X] T022 [P] [US1] Listen for PARTICIPANT_LEFT event in apps/frontend/app/room/[code]/page.tsx
	- [X] T023 [US1] Update participant list UI to show disconnection badges in apps/frontend/app/room/[code]/page.tsx
	- [X] T024 [US1] Add visual indicators for disconnected players in apps/frontend/app/room/[code]/page.tsx
	- [ ] T025 [US1] Test round completion with disconnected players and verify UI updates

**Checkpoint**: At this point, games should continue when players disconnect without breaking

---

## Phase 4: User Story 2 - Seamless Page Refresh Recovery (Priority: P1) 🎯 MVP

**Goal**: Allow players to refresh browser and immediately rejoin game in current state without blank screens

**Validation**:
1. Join a game as authenticated user
2. Refresh browser during lobby - verify rejoin with ready status preserved
3. Refresh during active round - verify see current question and timer
4. Refresh on results page - verify see results and can ready up
5. Repeat with anonymous user using localStorage

### Backend Implementation for US2

- [X] T026 [P] [US2] Enhance JOIN handler reconnection detection logic in apps/backend/src/socket/room.handler.ts to check userId or participantId
- [X] T027 [P] [US2] Add participantId support for anonymous users in JOIN handler in apps/backend/src/socket/room.handler.ts
- [X] T028 [US2] Implement reconnection response with full room state in apps/backend/src/socket/room.handler.ts
- [X] T029 [US2] Add RECONNECTED event emission in apps/backend/src/socket/room.handler.ts
- [X] T030 [US2] Update socketId on reconnection in apps/backend/src/services/room.service.ts

### Frontend Implementation for US2

- [X] T031 [P] [US2] Add participantId localStorage logic in apps/frontend/app/room/[code]/page.tsx useEffect
- [X] T032 [P] [US2] Implement reconnection attempt on mount in apps/frontend/app/room/[code]/page.tsx
- [X] T033 [US2] Listen for RECONNECTED event and update UI state in apps/frontend/app/room/[code]/page.tsx
- [X] T034 [P] [US2] Handle reconnection toast notifications in apps/frontend/app/room/[code]/page.tsx
- [X] T035 [P] [US2] Test refresh in all game states (lobby, active, results) for both authenticated and anonymous users

**Checkpoint**: At this point, page refresh should work seamlessly in all game states

---

## Phase 5: User Story 3 - Mid-Game Joining as Spectator (Priority: P2)

**Goal**: Allow new players to join active games as spectators, watching in real-time and becoming active participants when game returns to lobby

**Validation**:
1. Start game with 2 players
2. Have third player join mid-game
3. Verify they see spectator view with current question and leaderboard
4. Verify they cannot answer questions
5. Complete game and return to lobby
6. Verify spectator becomes active participant and can ready up

### Backend Implementation for US3

- [X] T036 [P] [US3] Add role assignment logic in JOIN handler in apps/backend/src/socket/room.handler.ts (active if lobby and <16 active, else spectator)
- [X] T037 [P] [US3] Update SUBMIT_ANSWER validation in apps/backend/src/socket/game.handler.ts to check role='active'
- [X] T038 [P] [US3] Implement spectator promotion logic in NEXT_QUESTION handler in apps/backend/src/socket/game.handler.ts
- [X] T039 [US3] Add spectator count to PARTICIPANT_JOINED broadcast in apps/backend/src/socket/room.handler.ts
- [X] T040 [US3] Update PLAYER_READY to reject spectator ready-up in apps/backend/src/socket/game.handler.ts

### Frontend Implementation for US3

- [X] T041 [P] [US3] Create SpectatorBadge component in apps/frontend/app/room/[code]/components/SpectatorBadge.tsx
- [X] T042 [P] [US3] Update game UI to show spectator badge for current user in apps/frontend/app/room/[code]/page.tsx
- [X] T043 [P] [US3] Disable answer submission buttons when role='spectator' in apps/frontend/app/room/[code]/page.tsx
- [X] T044 [US3] Display spectator indicators in participant list in apps/frontend/app/room/[code]/page.tsx
- [X] T045 [US3] Show toast notification when promoted from spectator to active in apps/frontend/app/room/[code]/page.tsx
- [X] T046 [US3] Test mid-game join and spectator promotion flow

**Checkpoint**: At this point, spectators can join and watch games, then participate in next round

---

## Phase 6: User Story 4 - Question Category Selection (Priority: P2)

**Goal**: Allow room creators to select question category for themed trivia games, with all questions coming from selected category

**Validation**:
1. Create group room and see category dropdown
2. Select "Science" category
3. Start game and verify all questions are Science category
4. Complete game and ready up for second round
5. Verify category persists for second game

### Backend Implementation for US4

- [ ] T047 [P] [US4] Create getCategoriesWithCount method in apps/backend/src/services/question.service.ts
- [ ] T048 [P] [US4] Create GET /api/questions/categories endpoint in apps/backend/src/routes/question.routes.ts
- [ ] T049 [P] [US4] Add category validation to CREATE_ROOM handler in apps/backend/src/socket/room.handler.ts
- [ ] T050 [US4] Update question fetching in apps/backend/src/services/game.service.ts to filter by selectedCategory
- [ ] T051 [US4] Add selectedCategory to room state broadcasts in apps/backend/src/socket/room.handler.ts
- [ ] T052 [US4] Validate category has >=10 questions in apps/backend/src/services/room.service.ts

### Frontend Implementation for US4

- [ ] T053 [P] [US4] Create CategorySelect component in apps/frontend/app/groups/[id]/components/CategorySelect.tsx
- [ ] T054 [P] [US4] Fetch categories on mount in CategorySelect component
- [ ] T055 [US4] Add category selection to room creation form in apps/frontend/app/groups/[id]/page.tsx
- [ ] T056 [US4] Display selected category in lobby in apps/frontend/app/lobby/[code]/page.tsx
- [ ] T057 [US4] Show category in question display during game in apps/frontend/app/room/[code]/page.tsx
- [ ] T058 [US4] Test category selection and question filtering

**Checkpoint**: At this point, category selection should work and filter questions correctly

---

## Phase 7: User Story 5 - AI Feedback Modes (Priority: P2)

**Goal**: Allow room creators to choose AI feedback tone (Supportive, Neutral, Roast Me), determining the style of feedback players receive

**Validation**:
1. Create room with "Supportive" mode and verify encouraging feedback
2. Create room with "Neutral" mode and verify factual feedback
3. Create room with "Roast Me" mode and verify humorous sarcastic feedback
4. Verify feedback mode displays in lobby
5. Verify mode persists across multiple rounds

### Backend Implementation for US5

- [ ] T059 [P] [US5] Add feedbackMode parameter to CREATE_ROOM handler in apps/backend/src/socket/room.handler.ts
- [ ] T060 [P] [US5] Update AI service integration in apps/backend/src/services/ai.service.ts to accept feedbackMode
- [ ] T061 [US5] Pass feedbackMode to AI service in answer evaluation in apps/backend/src/services/game.service.ts
- [ ] T062 [US5] Add roastMode to feedbackMode mapping for backwards compatibility in apps/backend/src/socket/room.handler.ts
- [ ] T063 [US5] Include feedbackMode in room state broadcasts in apps/backend/src/socket/room.handler.ts

### Frontend Implementation for US5

- [ ] T064 [P] [US5] Create FeedbackModeSelect component in apps/frontend/app/groups/[id]/components/FeedbackModeSelect.tsx
- [ ] T065 [P] [US5] Add feedback mode selector to room creation form in apps/frontend/app/groups/[id]/page.tsx
- [ ] T066 [US5] Display feedback mode badge in lobby in apps/frontend/app/lobby/[code]/page.tsx
- [ ] T067 [US5] Verify AI feedback tone matches selected mode during gameplay
- [ ] T068 [US5] Test all three feedback modes with multiple questions

**Checkpoint**: At this point, AI feedback modes should work with appropriate tones

---

## Phase 8: User Story 6 - Vote to End Game (Priority: P3)

**Goal**: Allow players to vote to end game early on results page, with game ending when majority reached

**Validation**:
1. Start game with 4 players
2. Complete a round and reach results page
3. Have 2 players vote to end (50% of 4)
4. Verify game ends immediately and shows final results
5. Verify vote button not available during answering
6. Test vote recalculation when player disconnects

### Backend Implementation for US6

- [ ] T069 [P] [US6] Create VOTE_TO_END handler in apps/backend/src/socket/game.handler.ts
- [ ] T070 [P] [US6] Create CANCEL_VOTE handler in apps/backend/src/socket/game.handler.ts
- [ ] T071 [P] [US6] Implement vote threshold calculation logic in apps/backend/src/services/game.service.ts
- [ ] T072 [US6] Add voteState initialization on results page in apps/backend/src/socket/game.handler.ts
- [ ] T073 [US6] Implement dynamic threshold recalculation on disconnect in apps/backend/src/services/game.service.ts
- [ ] T074 [US6] Add vote state clearing logic in PLAYER_READY handler in apps/backend/src/socket/game.handler.ts
- [ ] T075 [US6] Broadcast VOTE_UPDATED events in apps/backend/src/socket/game.handler.ts
- [ ] T076 [US6] Trigger game end when vote threshold met in apps/backend/src/socket/game.handler.ts

### Frontend Implementation for US6

- [ ] T077 [P] [US6] Create VoteToEndButton component in apps/frontend/app/room/[code]/components/VoteToEndButton.tsx
- [ ] T078 [P] [US6] Add vote button to results page (conditional on gameState='results') in apps/frontend/app/room/[code]/page.tsx
- [ ] T079 [P] [US6] Listen for VOTE_UPDATED events and update vote count display in apps/frontend/app/room/[code]/page.tsx
- [ ] T080 [US6] Implement vote and cancel vote handlers in apps/frontend/app/room/[code]/page.tsx
- [ ] T081 [US6] Show vote progress indicator (current/required votes) in VoteToEndButton component
- [ ] T082 [US6] Hide vote button during answering phase in apps/frontend/app/room/[code]/page.tsx
- [ ] T083 [US6] Test vote-to-end with various player counts and disconnections

**Checkpoint**: At this point, all user stories should be independently functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T084 [P] Add reconnection mid-round spectator logic (when reconnecting during active round) in apps/backend/src/socket/room.handler.ts
- [ ] T085 [P] Verify 16 active player limit enforcement in apps/backend/src/services/room.service.ts
- [ ] T086 [P] Create RoomSettings display component in apps/frontend/app/lobby/[code]/components/RoomSettings.tsx
- [ ] T087 Review all Socket.IO event handlers for proper error handling in apps/backend/src/socket/
- [ ] T088 Review all frontend components for responsive design (mobile 320px+, tablet 768px+, desktop 1024px+)
- [ ] T089 Add debug logging for connection state changes in apps/backend/src/socket/index.ts
- [ ] T090 Verify clean code standards across all modified files
- [ ] T091 Run through quickstart.md testing checklist for all scenarios
- [ ] T092 Performance test with 16 active players + spectators
- [ ] T093 Test edge cases: rapid refreshes, simultaneous disconnects, vote race conditions
- [ ] T094 Update .github/copilot-instructions.md if any new patterns emerged (already updated by plan command)
- [ ] T095 Code review and refactor for clean code principles

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3 - P1)**: Depends on Foundational - Can proceed after Phase 2
- **User Story 2 (Phase 4 - P1)**: Depends on Foundational - Can proceed after Phase 2
- **User Story 3 (Phase 5 - P2)**: Depends on Foundational and US1/US2 (reconnection logic)
- **User Story 4 (Phase 6 - P2)**: Depends on Foundational - Can proceed after Phase 2
- **User Story 5 (Phase 7 - P2)**: Depends on Foundational - Can proceed after Phase 2
- **User Story 6 (Phase 8 - P3)**: Depends on Foundational and US1 (connection status)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent - Can start after Foundational
- **User Story 2 (P1)**: Independent - Can start after Foundational
- **User Story 3 (P2)**: Requires US1 (connectionStatus) and US2 (reconnection logic)
- **User Story 4 (P2)**: Independent - Can start after Foundational
- **User Story 5 (P2)**: Independent - Can start after Foundational
- **User Story 6 (P3)**: Requires US1 (connectionStatus for vote eligibility)

### Recommended Implementation Order

1. **Phase 1-2**: Setup + Foundational (required first)
2. **MVP Milestone**: User Story 1 + User Story 2 (P1 stories - critical stability fixes)
3. **Enhancement Milestone 1**: User Story 4 + User Story 5 (P2 stories - independent customization)
4. **Enhancement Milestone 2**: User Story 3 (P2 story - requires US1/US2)
5. **Enhancement Milestone 3**: User Story 6 (P3 story - requires US1)
6. **Phase 9**: Polish

### Parallel Opportunities

**Within Foundational Phase**:
- T005-T007 (type definitions) can run in parallel
- T013-T014 (frontend types) can run in parallel after backend types complete

**Across User Stories** (after Foundational complete):
- US1 and US2 can be worked on in parallel (both P1, independent)
- US4 and US5 can be worked on in parallel (both P2, independent)

**Within Each User Story**:
- Backend tasks marked [P] can run in parallel
- Frontend tasks marked [P] can run in parallel
- Backend implementation usually before frontend for each story

---

## Parallel Example: User Story 1

```bash
# After Foundational phase, launch backend tasks together:
T015: Modify disconnect handler (apps/backend/src/socket/index.ts)
T016: Add PARTICIPANT_LEFT broadcast (apps/backend/src/socket/index.ts - same file, wait for T015)
T017: Implement cleanup timer (apps/backend/src/store/room.store.ts)

# Launch frontend tasks together:
T021: Create ConnectionStatus component (apps/frontend/app/room/[code]/components/ConnectionStatus.tsx)
T022: Listen for PARTICIPANT_LEFT event (apps/frontend/app/room/[code]/page.tsx)
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only - Critical Stability)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Disconnection Handling)
4. Complete Phase 4: User Story 2 (Refresh Recovery)
5. **STOP and VALIDATE**: Manually test both stability features thoroughly
6. Deploy/demo if ready - **Core stability issues are now fixed**

### Full Feature Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 + US2 → Manually test independently → Deploy/Demo (MVP - Stability fixed!)
3. Add US4 + US5 (in parallel) → Manually test independently → Deploy/Demo (Category & Feedback modes)
4. Add US3 → Manually test independently → Deploy/Demo (Spectator mode - uses stability from US1/US2)
5. Add US6 → Manually test independently → Deploy/Demo (Vote to end)
6. Complete Phase 9: Polish
7. Each milestone adds value without breaking previous functionality

### Parallel Team Strategy

With multiple developers after Foundational complete:

- **Developer A**: User Story 1 (Disconnection handling)
- **Developer B**: User Story 2 (Refresh recovery)
- **Developer C**: User Story 4 (Categories) then User Story 5 (Feedback modes)

Then:
- **Developer A**: User Story 3 (Spectator - after US1/US2 merge)
- **Developer B**: User Story 6 (Vote to end - after US1 merge)
- **Developer C**: Polish tasks

---

## Summary

**Total Tasks**: 95 tasks
- Setup: 4 tasks
- Foundational: 10 tasks
- User Story 1 (P1): 11 tasks
- User Story 2 (P1): 10 tasks
- User Story 3 (P2): 11 tasks
- User Story 4 (P2): 12 tasks
- User Story 5 (P2): 10 tasks
- User Story 6 (P3): 15 tasks
- Polish: 12 tasks

**MVP Scope**: Setup + Foundational + US1 + US2 = 35 tasks (critical stability fixes)

**Independent Stories**: US1, US2, US4, US5 can start immediately after Foundational

**Dependent Stories**: US3 (needs US1/US2), US6 (needs US1)

**Parallel Opportunities**: 
- 3 tasks in Setup phase
- 5 tasks in Foundational phase
- Multiple backend/frontend tasks within each story
- US1 and US2 can be worked in parallel
- US4 and US5 can be worked in parallel

**Estimated Timeline**: 
- MVP (US1+US2): 2-3 days
- Full feature (all stories): 5-7 days
- With 2 developers: 3-4 days

---

## Notes

- [P] tasks = different files, can run in parallel with no conflicts
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and manually testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently through manual testing
- Per constitution: No testing infrastructure - quality assured through code review and manual testing
- Refer to quickstart.md for detailed testing scenarios for each story
