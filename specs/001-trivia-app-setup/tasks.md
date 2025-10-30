# Tasks: Quizable Auth + Theme Foundation

**Input**: Design documents from `/specs/001-trivia-app-setup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: No automated tests required per constitution and feature specification

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US4)
- Include exact file paths in descriptions

## Path Conventions

- Single TanStack Start project at repository root
- Routes: `src/routes/`
- Components: `src/components/`
- Integrations: `src/integrations/`
- Utilities: `src/lib/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [ ] T001 Verify package.json has required dependencies (@tanstack/react-start, @tanstack/react-router, @clerk/clerk-react, next-themes, shadcn/ui, tailwindcss)
- [ ] T002 Install missing dependencies if any: npm install
- [ ] T003 [P] Verify or create .env.local with VITE_CLERK_PUBLISHABLE_KEY placeholder
- [ ] T004 [P] Verify vite.config.ts is configured for TanStack Start with necessary plugins
- [ ] T005 [P] Verify tailwind.config.ts has theme configuration for light/dark via CSS variables
- [ ] T006 [P] Verify src/styles.css imports Tailwind base, components, utilities and defines CSS vars for colors

**Checkpoint**: Basic project structure and dependencies ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Update src/lib/utils.ts to ensure cn() utility exists (for conditional Tailwind classes)
- [ ] T008 Verify or create src/integrations/clerk/provider.tsx with ClerkProvider wrapper
- [ ] T009 Create src/integrations/theme/provider.tsx implementing ThemeProvider from next-themes with class strategy
- [ ] T010 Update src/routes/__root.tsx to wrap app with ClerkProvider and ThemeProvider in correct order
- [ ] T011 [P] Create or verify src/components/ui/ directory exists for shadcn components
- [ ] T012 [P] Verify src/router.tsx is configured with TanStack Router

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - User Authentication Flow (Priority: P1) 🎯 MVP

**Goal**: Implement Clerk-gated authentication so unauthenticated users see login screen and authenticated users land on home screen

**Independent Test**: 
1. Visit app logged out → should see Clerk sign-in component
2. Sign in with valid credentials → redirected to home screen
3. Visit app already logged in → go directly to home screen
4. Sign in with invalid credentials → see error, remain on login
5. Click logout → redirected to login screen

### Implementation for User Story 1

- [ ] T013 [P] [US1] Create src/routes/sign-in.tsx route with Clerk SignIn component for login page
- [ ] T014 [P] [US1] Create src/routes/sign-up.tsx route with Clerk SignUp component for registration page
- [ ] T015 [US1] Update src/routes/index.tsx to check auth state using useAuth from @clerk/clerk-react
- [ ] T016 [US1] In src/routes/index.tsx redirect unauthenticated users to /sign-in
- [ ] T017 [US1] In src/routes/index.tsx show Home screen content for authenticated users (placeholder: "Welcome to Quizable")
- [ ] T018 [P] [US1] Create src/integrations/clerk/header-user.tsx component with UserButton for logout (already exists, verify it shows user profile and sign out)
- [ ] T019 [US1] Update src/components/Header.tsx to include header-user component when authenticated

**Checkpoint**: At this point, User Story 1 should be fully functional - auth flow works end-to-end

---

## Phase 4: User Story 4 - Theme Customization (Priority: P4)

**Goal**: Implement light/dark theme toggle that persists across sessions and applies consistently

**Independent Test**:
1. Access theme toggle → can switch between light and dark
2. Select dark mode → all screens use dark theme
3. Log out and back in → theme preference maintained
4. No preference set on first visit → defaults to system preference or light mode

### Implementation for User Story 4

- [ ] T020 [P] [US4] Install shadcn/ui Button and DropdownMenu components: pnpx shadcn@latest add button dropdown-menu
- [ ] T021 [P] [US4] Create src/components/theme-toggle.tsx with theme switcher using next-themes useTheme hook
- [ ] T022 [US4] In theme-toggle.tsx add button with Sun/Moon icons from lucide-react
- [ ] T023 [US4] In theme-toggle.tsx implement dropdown with Light, Dark, System options
- [ ] T024 [US4] Update src/components/Header.tsx to include theme-toggle component
- [ ] T025 [US4] Verify theme provider in src/integrations/theme/provider.tsx has attribute="class" and enableSystem={true}
- [ ] T026 [US4] Verify theme provider has storageKey="quizable-theme" for localStorage persistence
- [ ] T027 [US4] Test theme switching on all existing screens (login, sign-up, home) to ensure consistent styling

**Checkpoint**: Theme customization fully functional - theme persists and applies across all screens

---

## Phase 5: Polish & Integration

**Purpose**: Final touches and cross-story integration

- [ ] T028 [P] Update src/components/Header.tsx with Quizable branding and layout (logo/title, theme toggle, user menu)
- [ ] T029 [P] Verify home screen (src/routes/index.tsx) shows welcoming content for authenticated users
- [ ] T030 Add loading states to sign-in and sign-up routes using Clerk's loading prop
- [ ] T031 [P] Verify all Tailwind theme colors work in both light and dark modes
- [ ] T032 [P] Test full user journey: visit app → sign in → see home → toggle theme → log out → sign back in → theme persists
- [ ] T033 Verify .env.local setup instructions in quickstart.md are accurate
- [ ] T034 Run npm run dev and manually validate all acceptance scenarios from spec.md

**Checkpoint**: Feature complete and ready for demo/deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2)
- **User Story 4 (Phase 4)**: Depends on Foundational (Phase 2) - can proceed in parallel with US1 after Phase 2
- **Polish (Phase 5)**: Depends on US1 and US4 completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Independent of US1 (but US1 creates screens to test theme on)

### Within Each User Story

**User Story 1**:
- T013 (sign-in route) and T014 (sign-up route) can run in parallel
- T015-T017 (index.tsx updates) must run sequentially
- T018 (header-user component) can run in parallel with T015-T017
- T019 (Header update) depends on T018

**User Story 4**:
- T020 (install components) and T021-T023 (theme-toggle) can overlap
- T024 (add to Header) depends on T021-T023
- T025-T026 (provider config) can run in parallel with T021-T024
- T027 (testing) must run after all others

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- Phase 2 tasks T011, T012 can run in parallel
- Once Foundational phase completes:
  - US1 and US4 can be worked on in parallel (by different developers or sequentially)
- Within US1: T013, T014, T018 can all run in parallel
- Within US4: T020, T021-T023, T025-T026 can run in parallel

---

## Parallel Example: After Foundational Phase

```bash
# Two developers can work simultaneously:

Developer A (User Story 1 - Auth):
- Task T013: Create sign-in route
- Task T014: Create sign-up route  
- Task T015-T017: Update index route for auth
- Task T018: Create header-user component
- Task T019: Add to Header

Developer B (User Story 4 - Theme):
- Task T020: Install shadcn components
- Task T021-T023: Create theme-toggle
- Task T024: Add theme-toggle to Header
- Task T025-T027: Configure and test theming
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup ✓
2. Complete Phase 2: Foundational ✓
3. Complete Phase 3: User Story 1 ✓
4. **STOP and VALIDATE**: Test all auth acceptance scenarios
5. Can deploy just auth if needed (theme comes later)

### Full Feature (Both Stories)

1. Complete Phase 1: Setup ✓
2. Complete Phase 2: Foundational ✓
3. Complete Phase 3 AND Phase 4 in parallel (if team capacity) or sequentially (US1 then US4)
4. Complete Phase 5: Polish & Integration
5. Validate all acceptance scenarios for both stories
6. Deploy complete auth + theme foundation

### Incremental Delivery

- After Phase 3: Have working auth-gated app (MVP!)
- After Phase 4: Add theme support (enhancement)
- After Phase 5: Polished, production-ready foundation

---

## Summary

- **Total Tasks**: 34
- **User Story 1 (Auth)**: 7 tasks
- **User Story 4 (Theme)**: 8 tasks
- **Setup + Foundational**: 12 tasks
- **Polish**: 7 tasks
- **Parallel Opportunities**: 15 tasks marked [P]
- **MVP Scope**: Phases 1-3 only (auth working)
- **Full Feature**: All phases (auth + theme)

---

## Notes

- No automated tests per constitution - rely on manual acceptance validation
- Each [P] task works on different files and can run in parallel
- [US1] and [US4] labels map tasks to specific user stories for traceability
- Both user stories are independently testable after their respective phases
- Verify Clerk publishable key is set in .env.local before starting Phase 3
- Theme colors should be defined in tailwind.config.ts and src/styles.css
- Commit after each task or logical group for incremental progress
