# Tasks: Authentication, Groups, and Persistent Leaderboards

**Input**: Design documents from `/specs/003-auth-group-leaderboard/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Per project constitution, this project does NOT include testing infrastructure. Quality assurance is performed through code review and manual testing per quickstart.md procedures.

**Organization**: Tasks are grouped by user story to enable independent implementation of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

**Monorepo Structure**:
- Backend: `apps/backend/src/`
- Frontend: `apps/frontend/app/`
- Prisma: `apps/backend/prisma/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency installation, and environment configuration

- [X] T001 Install backend dependencies in apps/backend: @prisma/client, prisma, @clerk/clerk-sdk-node, svix (webhook validation)
- [X] T002 Install frontend dependencies in apps/frontend: @clerk/nextjs
- [X] T003 [P] Create apps/backend/.env with DATABASE_URL, CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET, PORT=3001
- [X] T004 [P] Create apps/frontend/.env.local with NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, NEXT_PUBLIC_API_URL=http://localhost:3001
- [X] T005 [P] Add .env and .env.local to .gitignore if not already present
- [X] T006 Setup local PostgreSQL via Docker Compose per quickstart.md (create docker-compose.yml in project root with postgres:17-alpine)
- [ ] T007 Start Docker postgres container and verify connection with psql
- [X] T008 Initialize Prisma in apps/backend: npx prisma init (creates prisma/ directory)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema & Migrations

- [X] T009 Copy complete Prisma schema from data-model.md to apps/backend/prisma/schema.prisma (models: User, Group, Membership, GroupInvite, GroupLeaderboardEntry, Room with extensions)
- [X] T010 Run Prisma migration: npx prisma migrate dev --name init (creates migrations/ and applies to database)
- [X] T011 Generate Prisma Client: npx prisma generate (creates @prisma/client types)
- [X] T012 Verify schema in Prisma Studio: npx prisma studio (opens at localhost:5555)

### Backend Infrastructure

- [X] T013 Create apps/backend/src/config/prisma.ts with PrismaClient singleton instance and connection logging
- [X] T014 [P] Create apps/backend/src/middleware/auth.middleware.ts with requireAuth function using @clerk/clerk-sdk-node to verify session tokens
- [X] T015 [P] Create apps/backend/src/types/express.d.ts to extend Express Request with userId property
- [X] T016 [P] Create apps/backend/src/utils/error-handler.util.ts with standardized error response format per http-api.md
- [X] T017 Update apps/backend/src/app.ts to register new route groups (webhooks, groups, invites) with CORS configuration for frontend origin

### Frontend Infrastructure

- [X] T018 Wrap Next.js app in ClerkProvider in apps/frontend/app/layout.tsx
- [X] T019 Create apps/frontend/middleware.ts with Clerk authMiddleware to protect authenticated routes (publicRoutes: ['/'])
- [X] T020 [P] Create apps/frontend/app/lib/api-client.ts with fetch wrapper that automatically adds Clerk session token to Authorization header
- [X] T021 [P] Create apps/frontend/app/lib/types.ts with TypeScript interfaces for Group, Membership, Invite, LeaderboardEntry (matching Prisma schema)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Sign up / Sign in (Priority: P1) 🎯 MVP

**Goal**: Allow users to create accounts, sign in, and persist identity across sessions with automatic database sync

**Validation**: 
1. Open app homepage and click sign-up
2. Register with email and password
3. Verify sign-in succeeds and UserButton displays
4. Check Prisma Studio - User table should have entry with Clerk userId
5. Sign out and sign back in - profile persists

### Backend: Clerk Webhook Integration

- [ ] T022 [US1] Create apps/backend/src/routes/webhook.routes.ts with POST /api/webhooks/clerk endpoint
- [ ] T023 [US1] Implement Svix signature verification in webhook handler using svix library and CLERK_WEBHOOK_SECRET
- [ ] T024 [US1] Handle user.created event: upsert User with id, email, displayName, avatarUrl from Clerk data
- [ ] T025 [US1] Handle user.updated event: update User displayName and avatarUrl
- [ ] T026 [US1] Handle user.deleted event: soft delete or hard delete User (decide based on data retention policy)
- [ ] T027 [US1] Register webhook routes in apps/backend/src/routes/index.ts
- [ ] T028 [US1] Test webhook with ngrok tunnel per quickstart.md section 2.2 and Clerk dashboard configuration

### Frontend: Authentication UI

- [ ] T029 [P] [US1] Create apps/frontend/app/components/auth-buttons.tsx with SignInButton, SignUpButton, UserButton from @clerk/nextjs
- [ ] T030 [P] [US1] Add AuthButtons component to main navigation in apps/frontend/app/layout.tsx or homepage
- [ ] T031 [US1] Verify Clerk sign-in/sign-up modals open correctly with responsive design on mobile/tablet/desktop
- [ ] T032 [US1] Test authentication flow: register → verify email → sign in → UserButton displays avatar
- [ ] T033 [US1] Verify user data syncs to database by checking Prisma Studio after registration

**Checkpoint**: At this point, User Story 1 should be fully functional - users can register, sign in, and their data persists in the database

---

## Phase 4: User Story 2 - Create and Join Groups (Priority: P2)

**Goal**: Authenticated users can create groups, generate invites, and other users can join via invite link or code

**Validation**:
1. Sign in as User A
2. Create a group named "Test Squad"
3. Generate an invite and copy link
4. Sign in as User B in incognito window
5. Accept invite via link
6. Verify User B appears in group member list
7. Verify only User A (admin) sees admin-only controls

### Backend: Group Management API

- [ ] T034 [P] [US2] Create apps/backend/src/services/group.service.ts with createGroup, getUserGroups, getGroupDetail, updateGroup functions using Prisma
- [ ] T035 [P] [US2] Create apps/backend/src/services/membership.service.ts with addMember, removeMember, updateRole, checkAdminPermission functions
- [ ] T036 [US2] Create apps/backend/src/routes/group.routes.ts with POST /api/groups endpoint (requireAuth, validate name 3-50 chars, create Group + Membership with ADMIN role)
- [ ] T037 [US2] Add GET /api/groups endpoint in group.routes.ts (requireAuth, return user's groups with role and memberCount, paginated)
- [ ] T038 [US2] Add GET /api/groups/:groupId endpoint in group.routes.ts (requireAuth, verify membership, return group detail with members list)
- [ ] T039 [US2] Add PATCH /api/groups/:groupId endpoint in group.routes.ts (requireAuth, verify admin role, validate and update group name)
- [ ] T040 [US2] Register group routes in apps/backend/src/routes/index.ts

### Backend: Invitation System API

- [ ] T041 [P] [US2] Create apps/backend/src/services/invite.service.ts with generateInvite, validateInvite, acceptInvite, revokeInvite, getGroupInvites functions
- [ ] T042 [P] [US2] Create apps/backend/src/utils/invite-code.util.ts to generate 6-character alphanumeric codes and map to/from tokens
- [ ] T043 [US2] Create apps/backend/src/routes/invite.routes.ts with POST /api/groups/:groupId/invites endpoint (requireAuth, verify admin, rate limit 10/hour, generate token + code)
- [ ] T044 [US2] Add GET /api/groups/:groupId/invites endpoint in invite.routes.ts (requireAuth, verify admin, return active/used/revoked invites)
- [ ] T045 [US2] Add POST /api/invites/:inviteId/revoke endpoint in invite.routes.ts (requireAuth, verify admin, update status to REVOKED)
- [ ] T046 [US2] Add POST /api/invites/:token/accept endpoint in invite.routes.ts (requireAuth, validate invite not expired/used/revoked, create Membership, mark invite as USED)
- [ ] T047 [US2] Add POST /api/invites/accept-code endpoint in invite.routes.ts (requireAuth, lookup by code, validate, accept same as token endpoint)
- [ ] T048 [US2] Register invite routes in apps/backend/src/routes/index.ts

### Backend: Membership Management API

- [ ] T049 [US2] Create apps/backend/src/routes/membership.routes.ts with POST /api/groups/:groupId/leave endpoint (requireAuth, verify not last admin, update status to LEFT)
- [ ] T050 [US2] Add POST /api/groups/:groupId/members/:userId/remove endpoint in membership.routes.ts (requireAuth, verify admin, prevent removing other admins, update status to REMOVED)
- [ ] T051 [US2] Add POST /api/groups/:groupId/members/:userId/promote endpoint in membership.routes.ts (requireAuth, verify admin, update role to ADMIN)
- [ ] T052 [US2] Register membership routes in apps/backend/src/routes/index.ts

### Frontend: Group Management UI

- [ ] T053 [P] [US2] Create apps/frontend/app/groups/page.tsx with groups list view (fetch GET /api/groups, display cards with name, memberCount, role badge)
- [ ] T054 [P] [US2] Create apps/frontend/app/components/create-group-form.tsx with shadcn/ui Input and Button (validate name 3-50 chars, call POST /api/groups)
- [ ] T055 [US2] Add create group button/modal to groups list page using CreateGroupForm component
- [ ] T056 [US2] Implement responsive grid layout for groups list (1 column mobile, 2 tablet, 3 desktop) using Tailwind
- [ ] T057 [US2] Add empty state to groups list page with "Create your first group" message and call-to-action
- [ ] T058 [US2] Add loading states during group creation and list fetch using shadcn/ui Skeleton components

### Frontend: Group Detail & Member Management UI

- [ ] T059 [P] [US2] Create apps/frontend/app/groups/[id]/page.tsx with group detail view (fetch GET /api/groups/:id, display name, members list, admin controls conditionally)
- [ ] T060 [P] [US2] Create apps/frontend/app/components/member-list.tsx to display members with avatars, names, role badges (Admin/Member)
- [ ] T061 [US2] Add admin-only controls in group detail page: generate invite button, remove member button, promote to admin button (show only if user has ADMIN role)
- [ ] T062 [US2] Implement member remove action with confirmation dialog using shadcn/ui AlertDialog
- [ ] T063 [US2] Implement promote to admin action with confirmation dialog
- [ ] T064 [US2] Implement leave group action with confirmation dialog (prevent if last admin with error message)
- [ ] T065 [US2] Add responsive layout for group detail page (stack on mobile, sidebar on desktop)

### Frontend: Invitation UI

- [ ] T066 [P] [US2] Create apps/frontend/app/components/generate-invite-modal.tsx with expiry selector (1-30 days) and display both link and code after generation
- [ ] T067 [P] [US2] Create apps/frontend/app/components/invite-list.tsx to display active invites with status, created date, revoke button for admins
- [ ] T068 [P] [US2] Create apps/frontend/app/invite/[token]/page.tsx to accept invite from link (extract token, call POST /api/invites/:token/accept, redirect to group page)
- [ ] T069 [P] [US2] Create apps/frontend/app/components/join-with-code-form.tsx with Input for 6-char code and submit to POST /api/invites/accept-code
- [ ] T070 [US2] Add copy-to-clipboard button for invite link and code using navigator.clipboard API with success toast
- [ ] T071 [US2] Add share button for invite link using Web Share API (fallback to copy) for mobile-friendly sharing
- [ ] T072 [US2] Implement invite expiry warning in UI (show "Expires in X days" badge, highlight if <24 hours)
- [ ] T073 [US2] Add revoke invite action with confirmation dialog and optimistic UI update
- [ ] T074 [US2] Handle invite errors: expired, revoked, already member, invalid code with user-friendly error messages

### Integration & Polish

- [ ] T075 [US2] Add group navigation link to main navigation/sidebar (visible only to authenticated users)
- [ ] T076 [US2] Test complete group creation → invite generation → acceptance flow per validation criteria
- [ ] T077 [US2] Test multiple admin scenario: promote member, verify both admins can invite/remove, prevent last admin from leaving
- [ ] T078 [US2] Test invite expiry: generate 1-day invite, manually update expiresAt in DB to past date, verify rejection
- [ ] T079 [US2] Verify responsive design on mobile (320px), tablet (768px), desktop (1024px+) for all group pages
- [ ] T080 [US2] Code cleanup: remove any task comments, ensure clean code standards per constitution

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can authenticate and fully manage groups with invites

---

## Phase 5: User Story 3 - Group-Affiliated Rooms (Priority: P3)

**Goal**: Group members can create trivia rooms on behalf of their group, with points attributed to the group leaderboard after game completion

**Validation**:
1. Sign in as group member
2. Navigate to group detail page
3. Click "Create Trivia Room" with group selected
4. Join room as another group member and a guest
5. Complete game
6. Verify member points appear on group leaderboard
7. Verify guest points do NOT appear on group leaderboard

### Backend: Room Extension for Groups

- [ ] T081 [US3] Update apps/backend/src/types/room.types.ts to add groupId and createdBy fields to Room interface
- [ ] T082 [US3] Extend createRoom function in apps/backend/src/services/room.service.ts to accept groupId parameter and validate user is group member
- [ ] T083 [US3] Update POST /api/rooms endpoint in apps/backend/src/routes/room.routes.ts to accept groupId in request body (requireAuth if groupId provided)
- [ ] T084 [US3] Add group membership validation in room creation: check Prisma Membership where userId and groupId and status = ACTIVE
- [ ] T085 [US3] Update Room storage in apps/backend/src/store/room.store.ts to persist groupId and createdBy fields

### Backend: Leaderboard Update Service

- [ ] T086 [P] [US3] Create apps/backend/src/services/leaderboard.service.ts with updateGroupLeaderboard function (accepts groupId, roomCode, results array)
- [ ] T087 [US3] Implement leaderboard update logic in leaderboard.service: for each member result, upsert GroupLeaderboardEntry incrementing totalPoints, skip non-members
- [ ] T088 [US3] Add duplicate game prevention in leaderboard update: check if room results already processed using Room + completedAt timestamp or separate ProcessedGame table
- [ ] T089 [US3] Create apps/backend/src/routes/internal.routes.ts with POST /api/internal/leaderboard/update endpoint (service token auth, not Clerk)
- [ ] T090 [US3] Register internal routes in apps/backend/src/routes/index.ts

### Backend: Socket.IO Extensions for Groups

- [ ] T091 [US3] Update room:create handler in apps/backend/src/socket/room.handler.ts to accept groupId parameter and fetch group name from Prisma
- [ ] T092 [US3] Add group membership check in room:create handler: if groupId provided, verify socket userId is member
- [ ] T093 [US3] Update room:joined event payload in room.handler.ts to include isGroupMember boolean flag (check Membership where userId and room.groupId)
- [ ] T094 [US3] Update game:complete handler in apps/backend/src/socket/game.handler.ts to call leaderboard.service.updateGroupLeaderboard if room has groupId
- [ ] T095 [US3] Add leaderboard:updated event broadcast to group members after leaderboard update completes (emit to io.to(`group:${groupId}`))
- [ ] T096 [US3] Implement automatic group room subscription: when user joins Socket.IO connection with auth token, auto-join rooms for all their groups

### Frontend: Group Room Creation UI

- [ ] T097 [P] [US3] Add "Create Trivia Room" button to group detail page (apps/frontend/app/groups/[id]/page.tsx)
- [ ] T098 [P] [US3] Create apps/frontend/app/components/create-group-room-form.tsx with group selector dropdown (if user in multiple groups) and room settings
- [ ] T099 [US3] Update apps/frontend/app/lib/websocket.ts to send groupId parameter in room:create event
- [ ] T100 [US3] Display group affiliation badge in room lobby (apps/frontend/app/room/[code]/page.tsx) showing group name and "Points count toward [Group Name] leaderboard"
- [ ] T101 [US3] Show isGroupMember indicator next to participant names in room lobby (e.g., green checkmark for members, grey for guests)

### Frontend: Group Room Gameplay Experience

- [ ] T102 [US3] Update apps/frontend/app/components/round-results.tsx to visually distinguish member points (highlighted/bold) from guest points (muted)
- [ ] T103 [US3] Add tooltip or footnote in round results explaining "Only group member points count toward leaderboard"
- [ ] T104 [US3] Update apps/frontend/app/components/winner-banner.tsx for group rooms to show top member (for group leaderboard) separately from overall winner
- [ ] T105 [US3] Add "View Group Leaderboard" button in game completion screen that navigates to group leaderboard page

### Integration & Polish

- [ ] T106 [US3] Test group room creation: create room with group, verify groupId stored, complete game, check leaderboard update in Prisma Studio
- [ ] T107 [US3] Test member vs guest point attribution: member gets 100 points → leaderboard updates, guest gets 50 points → leaderboard unchanged
- [ ] T108 [US3] Test duplicate game prevention: complete game, manually trigger leaderboard update again with same roomCode, verify points not double-counted
- [ ] T109 [US3] Test room without group affiliation: create room without groupId, complete game, verify no leaderboard update attempt
- [ ] T110 [US3] Verify Socket.IO leaderboard:updated event fires within 5 seconds of game completion per spec SC-003
- [ ] T111 [US3] Code cleanup: remove task comments, verify clean code standards

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - full group room flow with leaderboard attribution

---

## Phase 6: User Story 4 - View Group Leaderboard (Priority: P4)

**Goal**: Members can view the persistent group leaderboard showing cumulative points from all completed group games, with real-time updates

**Validation**:
1. Sign in as group member
2. Navigate to group leaderboard page
3. Verify member names, avatars, and totalPoints display correctly sorted by points descending
4. Open leaderboard in two browser windows
5. Complete a group game in one window
6. Verify leaderboard auto-updates in both windows within 5 seconds

### Backend: Leaderboard Query API

- [ ] T112 [P] [US4] Create apps/backend/src/routes/leaderboard.routes.ts with GET /api/groups/:groupId/leaderboard endpoint
- [ ] T113 [US4] Implement leaderboard query with requireAuth, verify user is group member, fetch GroupLeaderboardEntry with User include (displayName, avatarUrl)
- [ ] T114 [US4] Add pagination support to leaderboard query: query params page (default 1) and limit (default 50, max 100), return pagination metadata
- [ ] T115 [US4] Add sorting options to leaderboard query: sortBy (totalPoints or gamesPlayed if tracking) and order (asc/desc, default desc)
- [ ] T116 [US4] Calculate rank for each entry in leaderboard response (row_number over partition by groupId order by totalPoints desc)
- [ ] T117 [US4] Add groupInfo to leaderboard response: group name and totalGamesPlayed count (count distinct rooms with groupId)
- [ ] T118 [US4] Register leaderboard routes in apps/backend/src/routes/index.ts

### Backend: Real-Time Leaderboard Updates

- [ ] T119 [P] [US4] Create /groups namespace in apps/backend/src/socket/index.ts for group-specific Socket.IO events
- [ ] T120 [P] [US4] Create apps/backend/src/socket/group.handler.ts with group:subscribe and group:unsubscribe handlers
- [ ] T121 [US4] Implement group:subscribe handler: verify auth token, verify membership, join socket to room `group:${groupId}`
- [ ] T122 [US4] Implement group:unsubscribe handler: leave socket from room `group:${groupId}`
- [ ] T123 [US4] Update leaderboard.service.updateGroupLeaderboard to emit leaderboard:updated event to group room after update completes
- [ ] T124 [US4] Format leaderboard:updated payload per socketio-events.md: timestamp, updates array (userId, newTotal, pointsAdded, rank changes), topThree

### Frontend: Leaderboard Display UI

- [ ] T125 [P] [US4] Create apps/frontend/app/groups/[id]/leaderboard/page.tsx with leaderboard table view
- [ ] T126 [P] [US4] Create apps/frontend/app/components/leaderboard-table.tsx using shadcn/ui Table component
- [ ] T127 [US4] Implement leaderboard table columns: rank (#), avatar, displayName, totalPoints, last updated timestamp
- [ ] T128 [US4] Add visual rank indicators: gold/silver/bronze badges for top 3, numbers for rest
- [ ] T129 [US4] Implement responsive leaderboard table: full table on desktop, card list on mobile with same data
- [ ] T130 [US4] Add pagination controls to leaderboard using shadcn/ui Pagination component (50 entries per page)
- [ ] T131 [US4] Add loading skeleton for leaderboard table using shadcn/ui Skeleton components
- [ ] T132 [US4] Add empty state for leaderboard: "No games played yet. Create a trivia room to get started!" with call-to-action button

### Frontend: Real-Time Leaderboard Updates

- [ ] T133 [P] [US4] Update apps/frontend/app/lib/websocket.ts to support /groups namespace connection
- [ ] T134 [US4] Implement group:subscribe event emission when leaderboard page mounts (send groupId)
- [ ] T135 [US4] Implement group:unsubscribe event emission when leaderboard page unmounts
- [ ] T136 [US4] Add leaderboard:updated event listener in leaderboard page to update state with new totals
- [ ] T137 [US4] Implement optimistic UI update for leaderboard: highlight changed entries with green flash animation, re-sort table
- [ ] T138 [US4] Add toast notification when leaderboard updates: "Leaderboard updated! [Player Name] earned [X] points" with shadcn/ui Toast
- [ ] T139 [US4] Implement WebSocket reconnection handling: re-subscribe to group on reconnect, show offline indicator if disconnected

### Frontend: Leaderboard Features

- [ ] T140 [P] [US4] Add group summary card above leaderboard: group name, total members, total games played, created date
- [ ] T141 [P] [US4] Add filter/sort controls: sort by points (default) or recent activity, filter by active members only
- [ ] T142 [US4] Highlight current user's row in leaderboard with subtle background color or border
- [ ] T143 [US4] Add "Your Rank" sticky header on mobile showing current user's position and points while scrolling
- [ ] T144 [US4] Add member profile tooltip on hover: join date, games played in group, highest single-game score
- [ ] T145 [US4] Implement infinite scroll as alternative to pagination for better mobile UX (load next 50 on scroll to bottom)

### Integration & Polish

- [ ] T146 [US4] Add "Leaderboard" tab to group detail page navigation (alongside Members, Settings)
- [ ] T147 [US4] Test real-time update flow: open leaderboard in 2 windows, complete game, verify both update within 5s per spec SC-003
- [ ] T148 [US4] Test pagination: create 60+ leaderboard entries (seed script), verify pagination works, entries load correctly
- [ ] T149 [US4] Test WebSocket fallback: disconnect WebSocket, complete game, verify leaderboard updates via polling or manual refresh
- [ ] T150 [US4] Test rank calculation accuracy: create entries with tied points, verify rank assignment handles ties correctly
- [ ] T151 [US4] Verify responsive design on mobile, tablet, desktop for leaderboard table/card layouts
- [ ] T152 [US4] Code cleanup: remove task comments, verify clean code standards

**Checkpoint**: All user stories should now be independently functional - complete authentication, groups, invites, group rooms, and persistent leaderboards with real-time updates

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final production readiness

### Error Handling & Edge Cases

- [ ] T153 [P] Implement global error boundary in apps/frontend/app/error.tsx for unhandled errors with user-friendly message
- [ ] T154 [P] Add rate limiting middleware to backend routes: invites (10/hour/admin), groups (5/day/user) using in-memory store or Redis
- [ ] T155 Add network error handling in API client: retry logic for 5xx errors, user-friendly messages for 4xx errors
- [ ] T156 Handle session expiry gracefully: redirect to sign-in with return URL, show "Session expired" toast
- [ ] T157 Add validation error display: show field-level errors for forms using shadcn/ui Form error states
- [ ] T158 Test edge case: last admin tries to leave group without promoting another member, verify friendly error message
- [ ] T159 Test edge case: invite code collision (extremely rare), verify regeneration logic works

### Performance Optimization

- [ ] T160 [P] Add Prisma query optimization: review all queries, add necessary indexes, use select to limit fields
- [ ] T161 [P] Implement API response caching for GET /api/groups and GET /api/groups/:id/leaderboard (60s stale-while-revalidate)
- [ ] T162 Add database connection pooling configuration in Prisma config (10-20 connections for MVP)
- [ ] T163 Optimize leaderboard query: add composite index on (groupId, totalPoints DESC) if not already present
- [ ] T164 Implement lazy loading for member avatars in leaderboard using Next.js Image component with priority flags
- [ ] T165 Add bundle size optimization: analyze build, tree-shake unused code, verify @clerk/nextjs doesn't bloat bundle

### Accessibility & UX Polish

- [ ] T166 [P] Add ARIA labels to all interactive elements: buttons, links, form inputs for screen reader support
- [ ] T167 [P] Add keyboard navigation support: tab order, enter/space for buttons, escape to close modals
- [ ] T168 Add focus indicators for all interactive elements using Tailwind focus-visible utilities
- [ ] T169 Test color contrast for all text/background combinations to meet WCAG AA standards
- [ ] T170 Add loading indicators for all async actions: spinners, skeleton screens, progress bars
- [ ] T171 Add success feedback for all actions: toasts for create/update/delete operations using shadcn/ui Toast
- [ ] T172 Improve mobile UX: add bottom navigation for mobile, optimize touch targets (44x44px minimum)

### Documentation & Developer Experience

- [ ] T173 [P] Update README.md with feature overview, setup instructions link to quickstart.md
- [ ] T174 [P] Add inline code comments for complex business logic (e.g., leaderboard rank calculation, invite validation)
- [ ] T175 Create database seeding script in apps/backend/prisma/seed.ts for test data (users, groups, memberships, leaderboard entries)
- [ ] T176 Add environment variable validation on backend startup: check all required vars present, fail fast with clear error
- [ ] T177 Document Clerk webhook setup steps in DEPLOYMENT.md for production deployment
- [ ] T178 Add Prisma migration guide in DEPLOYMENT.md: how to run migrations in production

### Security Hardening

- [ ] T179 [P] Add input sanitization for all user-provided strings: group names, display names, prevent XSS
- [ ] T180 [P] Add CSRF protection to API endpoints using tokens or SameSite cookies
- [ ] T181 Verify Clerk webhook signature validation is working correctly: test with invalid signature, verify rejection
- [ ] T182 Add rate limiting to webhook endpoint to prevent abuse: max 100 requests/minute per IP
- [ ] T183 Review and restrict CORS configuration: only allow frontend origin, not wildcard
- [ ] T184 Add SQL injection protection review: verify Prisma parameterization prevents injection (should be automatic)

### Final Validation

- [ ] T185 Run complete quickstart.md validation: follow all manual test steps, verify each acceptance scenario
- [ ] T186 Test all success criteria from spec.md: SC-001 (2min to create group), SC-002 (60s invite acceptance), SC-003 (<5s leaderboard update), SC-004 (90% usability), SC-005 (100% data retention)
- [ ] T187 Test cross-browser compatibility: Chrome, Firefox, Safari, Edge on desktop; Safari iOS, Chrome Android on mobile
- [ ] T188 Test responsive design across device sizes: 320px (small mobile), 375px (iPhone), 768px (tablet), 1024px (desktop), 1920px (large desktop)
- [ ] T189 Code review: verify all code follows clean code standards, no task/ticket comments, self-documenting variable names
- [ ] T190 Security review: verify no secrets in code, environment variables properly configured, authentication working correctly
- [ ] T191 Performance check: verify <2s page load for authenticated routes, <5s leaderboard updates per spec
- [ ] T192 Final git commit: "Complete 003-auth-group-leaderboard implementation" with summary of all features added

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
  - T009-T012 (Prisma schema + migrations) MUST complete before any database work
  - T013-T017 (Backend infrastructure) MUST complete before any backend routes
  - T018-T021 (Frontend infrastructure) MUST complete before any frontend pages
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
  - No dependencies on other user stories
- **User Story 2 (Phase 4)**: Depends on Foundational AND User Story 1 completion
  - Requires authentication (US1) to work
  - Group creation depends on authenticated users existing
- **User Story 3 (Phase 5)**: Depends on Foundational AND User Story 2 completion
  - Requires groups to exist (US2) before creating group-affiliated rooms
  - Authentication (US1) required but transitive through US2
- **User Story 4 (Phase 6)**: Depends on Foundational AND User Story 3 completion
  - Requires group games to exist (US3) to display meaningful leaderboard data
  - Groups (US2) and auth (US1) required but transitive through US3
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### Within Each User Story

**US1 (Authentication)**:
- Backend webhook (T022-T028) before Frontend UI (T029-T033)
- Webhook must work to sync users before testing frontend auth flow

**US2 (Groups & Invites)**:
- Backend services (T034-T035, T041-T042) before routes (T036-T048)
- Backend routes complete before Frontend UI (T053-T074)
- Group management before invitation system (can work in parallel but groups needed to test invites)

**US3 (Group Rooms)**:
- Backend room extension (T081-T085) before leaderboard service (T086-T090)
- Backend complete before Socket.IO extensions (T091-T096)
- Backend + Socket.IO complete before Frontend UI (T097-T105)

**US4 (Leaderboard)**:
- Backend leaderboard API (T112-T118) before real-time updates (T119-T124)
- Backend complete before Frontend display (T125-T132)
- Display working before real-time updates (T133-T139)
- Core functionality before feature polish (T140-T145)

### Parallel Opportunities

**Setup Phase**: T003, T004, T005 (environment files) can run in parallel

**Foundational Phase**:
- T014, T015, T016 (backend middleware/types/utils) can run in parallel after T013 (Prisma client)
- T020, T021 (frontend API client and types) can run in parallel after T018-T019 (Clerk setup)

**User Story 2**:
- T034, T035, T041, T042 (all backend services) can run in parallel
- T053, T054, T059, T060, T066, T067, T068, T069 (all frontend components) can run in parallel after backend routes complete

**User Story 3**:
- T086, T091 (leaderboard service and Socket.IO) can run in parallel after T081-T085
- T097, T098, T099, T100, T101 (all frontend room UI) can run in parallel after backend complete

**User Story 4**:
- T112-T118 (backend API) and T119-T124 (Socket.IO) can run in parallel
- T125, T126, T133 (frontend table, WebSocket client) can run in parallel after backend complete
- T140, T141, T142, T143, T144, T145 (all leaderboard features) can run in parallel after core display working

**Polish Phase**: Most tasks can run in parallel
- T153, T154, T155 (error handling) in parallel
- T160, T161, T162 (performance) in parallel
- T166, T167, T168 (accessibility) in parallel
- T173, T174, T175 (documentation) in parallel
- T179, T180, T181 (security) in parallel

---

## Parallel Example: User Story 2 - Backend Services

```bash
# Launch all backend service files together after Foundational phase:
Task T034: "Create group.service.ts with CRUD functions"
Task T035: "Create membership.service.ts with management functions"
Task T041: "Create invite.service.ts with invite lifecycle functions"
Task T042: "Create invite-code.util.ts with code generation"

# These files don't depend on each other, only on Prisma client (T013)
```

---

## Parallel Example: User Story 4 - Frontend Components

```bash
# Launch all frontend leaderboard components together after backend API complete:
Task T125: "Create leaderboard/page.tsx"
Task T126: "Create leaderboard-table.tsx component"
Task T133: "Update websocket.ts for /groups namespace"

# Launch all feature enhancements together after core display working:
Task T140: "Add group summary card"
Task T141: "Add filter/sort controls"
Task T142: "Highlight current user row"
Task T143: "Add 'Your Rank' sticky header"
Task T144: "Add member profile tooltip"
Task T145: "Implement infinite scroll"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T008)
2. Complete Phase 2: Foundational (T009-T021) - CRITICAL
3. Complete Phase 3: User Story 1 (T022-T033)
4. **STOP and VALIDATE**: Test authentication flow per validation criteria
5. Deploy/demo if ready - basic auth MVP delivered

### Recommended Incremental Delivery

1. **Week 1**: Setup + Foundational + User Story 1
   - Deliverable: Working authentication with user persistence
   - Validation: Users can register, sign in, data syncs to database

2. **Week 2**: User Story 2
   - Deliverable: Full group management with invitations
   - Validation: Users can create groups, invite others, manage members

3. **Week 3**: User Story 3
   - Deliverable: Group-affiliated trivia rooms with leaderboard attribution
   - Validation: Group games update persistent leaderboard

4. **Week 4**: User Story 4 + Polish
   - Deliverable: Real-time leaderboard with polish and production readiness
   - Validation: All success criteria from spec.md met

### Parallel Team Strategy (4 Developers)

**Week 1** (All together): Setup + Foundational
- All devs: Pair on T009-T012 (Prisma schema setup)
- Dev A: T013-T017 (Backend infrastructure)
- Dev B: T018-T021 (Frontend infrastructure)
- Dev C+D: Documentation and environment setup

**Week 2** (After Foundational complete):
- Dev A: User Story 1 backend (T022-T028)
- Dev B: User Story 1 frontend (T029-T033)
- Dev C: User Story 2 backend services (T034-T035, T041-T042)
- Dev D: User Story 2 backend routes (T036-T052)

**Week 3**:
- Dev A: User Story 3 backend (T081-T090)
- Dev B: User Story 3 Socket.IO (T091-T096)
- Dev C: User Story 2 frontend group management (T053-T065)
- Dev D: User Story 2 frontend invitations (T066-T074)

**Week 4**:
- Dev A: User Story 4 backend (T112-T124)
- Dev B: User Story 3 frontend (T097-T111)
- Dev C: User Story 4 frontend (T125-T145)
- Dev D: Polish phase (T153-T192)

---

## Task Summary

**Total Tasks**: 192

**Per User Story**:
- Setup: 8 tasks
- Foundational: 13 tasks (CRITICAL BLOCKER)
- User Story 1 (Auth): 12 tasks
- User Story 2 (Groups): 47 tasks (largest - includes groups, invites, memberships)
- User Story 3 (Group Rooms): 31 tasks
- User Story 4 (Leaderboard): 41 tasks
- Polish: 40 tasks

**Parallel Opportunities**: 58 tasks marked with [P] can run in parallel within their phase

**Independent Test Criteria**:
- US1: Register → Sign in → UserButton displays → Data in Prisma Studio
- US2: Create group → Generate invite → Accept invite → Member appears in list
- US3: Create group room → Complete game → Member points update leaderboard
- US4: View leaderboard → Complete game in separate window → Leaderboard updates within 5s

**Suggested MVP Scope**: User Story 1 only (Setup + Foundational + US1 = 33 tasks total)

**Format Validation**: ✅ All 192 tasks follow checklist format with checkbox, Task ID, optional [P] marker, [Story] label for US tasks, description with file path

---

## Notes

- Per constitution: No testing infrastructure - quality assured through code review and manual testing per quickstart.md
- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability and independent implementation
- Each user story phase should be independently completable and manually testable per validation criteria
- Commit after each task or logical group of parallel tasks
- Stop at any checkpoint to validate story independently
- Tasks reference specific file paths for immediate executability by LLM agents
- No task/ticket comments per code quality rules - all task IDs in this document only
