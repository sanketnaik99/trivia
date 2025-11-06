---
description: "Task list for UI Redesign with Dark Mode feature"
---

# Tasks: UI Redesign with Dark Mode

**Input**: Design documents from `/specs/004-ui-redesign-dark-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/README.md

**Tests**: Per project constitution, this project does NOT include testing infrastructure. Quality assurance is performed through code review and manual testing.

**Organization**: Tasks are grouped by user story to enable independent implementation of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a monorepo with web app structure:
- Backend: `apps/backend/src/`
- Frontend: `apps/frontend/` (Next.js App Router)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and prepare project structure for UI redesign

- [x] T001 Install next-themes dependency in apps/frontend/package.json
- [x] T002 [P] Verify lucide-react is available for theme toggle icons (Moon, Sun)
- [x] T003 [P] Verify existing logo files exist in apps/frontend/public/ (horizontal-logo-light.png, square-logo-light.png)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core theme infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Replace apps/frontend/app/globals.css with the exact OKLCH theme provided (light and dark modes, @theme inline block)
- [x] T005 [P] Create ThemeProvider wrapper component in apps/frontend/app/providers/theme-provider.tsx
- [x] T006 [P] Create ThemeToggle component in apps/frontend/components/ui/theme-toggle.tsx
- [x] T007 Update apps/frontend/app/layout.tsx to wrap app with ThemeProvider (attribute="class", defaultTheme="system", enableSystem)
- [x] T008 Add suppressHydrationWarning prop to html element in apps/frontend/app/layout.tsx
- [x] T009 Add ThemeToggle component to header/navigation in apps/frontend/app/layout.tsx (top right corner)
- [x] T010 Add prefers-reduced-motion CSS rule to apps/frontend/app/globals.css to disable animations when user preference is set

**Checkpoint**: Foundation ready - theme system functional, user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Landing Page Discovery (Priority: P1) 🎯 MVP

**Goal**: First-time visitors arrive at the app and encounter a welcoming landing page that explains what the trivia app is, showcases key features, and provides clear calls-to-action to either create or join a game room.

**Validation**: Navigate to the root URL (/) and verify:
1. Hero section appears with app logo, title "Real-Time Trivia Competitions", tagline, and two prominent CTAs ("Create Room" and "Join Room")
2. Features section appears below hero with 4 feature cards in a 2x2 grid (desktop) or stacked (mobile)
3. "Create Room" button navigates to room creation flow
4. "Join Room" button navigates to room joining flow
5. Layout is responsive on mobile (320px), tablet (768px), and desktop (1440px) screens
6. All text is readable with proper contrast in both light and dark modes

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create (marketing) route group directory at apps/frontend/app/(marketing)/
- [ ] T012 [P] [US1] Create components subdirectory at apps/frontend/app/(marketing)/components/
- [ ] T013 [P] [US1] Create HeroSection component in apps/frontend/app/(marketing)/components/hero.tsx
- [ ] T014 [P] [US1] Create FeaturesSection component in apps/frontend/app/(marketing)/components/features.tsx
- [ ] T015 [US1] Create landing page at apps/frontend/app/(marketing)/page.tsx that composes HeroSection and FeaturesSection
- [ ] T016 [US1] Implement hero section with Image component for horizontal-logo-light.png, h1 title, tagline, and two Button components for CTAs
- [ ] T017 [US1] Implement features section with 4 feature cards using lucide-react icons (Zap, Users, Clock, ShieldCheck) and descriptions
- [ ] T018 [US1] Add responsive grid layout to FeaturesSection (single column mobile, 2-column tablet/desktop)
- [ ] T019 [US1] Add proper spacing and whitespace using Tailwind utilities (py-20, px-4, gap-8, max-w-6xl mx-auto)
- [ ] T020 [US1] Wire up "Create Room" button to navigate to existing room creation route
- [ ] T021 [US1] Wire up "Join Room" button to navigate to existing room joining route
- [ ] T022 [US1] Verify responsive layout at breakpoints: 320px, 640px, 768px, 1024px, 1440px, 2560px
- [ ] T023 [US1] Verify touch targets are minimum 44x44px on mobile devices
- [ ] T024 [US1] Test theme switching on landing page - verify colors update correctly
- [ ] T025 [US1] Move existing root page.tsx to apps/frontend/app/lobby/page.tsx or delete if replaced by landing page

**Checkpoint**: At this point, User Story 1 should be fully functional and manually testable - landing page loads, CTAs work, responsive layout functions correctly

---

## Phase 4: User Story 2 - Dark Mode Support (Priority: P2)

**Goal**: Users can toggle between light and dark themes based on their preference, with the app remembering their choice across sessions and respecting their system preference by default.

**Validation**: 
1. Open app with system set to dark mode - app loads in dark mode automatically
2. Open app with system set to light mode - app loads in light mode automatically
3. Click theme toggle in header - entire app switches themes instantly (<100ms)
4. Refresh page - theme preference persists
5. Navigate between pages (landing, lobby, game room, groups, leaderboard) - theme remains consistent
6. Check localStorage - verify 'theme' key is saved
7. Test in private browsing mode - theme fallback to system works gracefully

### Implementation for User Story 2

- [ ] T026 [P] [US2] Verify all page routes apply theme consistently: apps/frontend/app/page.tsx (or lobby/page.tsx)
- [ ] T027 [P] [US2] Verify theme applies to apps/frontend/app/room/[roomId]/page.tsx
- [ ] T028 [P] [US2] Verify theme applies to apps/frontend/app/groups/page.tsx
- [ ] T029 [P] [US2] Verify theme applies to apps/frontend/app/groups/[groupId]/page.tsx
- [ ] T030 [P] [US2] Verify theme applies to apps/frontend/app/leaderboard/page.tsx
- [ ] T031 [US2] Test theme toggle keyboard accessibility (tab to button, enter to toggle)
- [ ] T032 [US2] Verify theme toggle has proper aria-label and tooltip for screen readers
- [ ] T033 [US2] Test localStorage persistence - toggle theme, refresh page, verify persistence
- [ ] T034 [US2] Test system preference detection - change OS theme, verify app detects and applies
- [ ] T035 [US2] Test private browsing mode - verify graceful fallback when localStorage is blocked
- [ ] T036 [US2] Audit all shadcn/ui components for dark mode compatibility in apps/frontend/components/ui/
- [ ] T037 [US2] Verify contrast ratios meet WCAG 2.1 AA (4.5:1) in both light and dark modes using browser DevTools
- [ ] T038 [US2] Test theme switching performance - verify <100ms switch time
- [ ] T039 [US2] Verify no flash of unstyled content (FOUC) on initial page load

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - landing page functions AND dark mode works across all pages

---

## Phase 5: User Story 3 - Refreshed Visual Design (Priority: P1)

**Goal**: All pages feature a redesigned interface that is sleek, minimal, and subtly playful, with clean typography, generous whitespace, and smooth (but not excessive) transitions that enhance rather than distract from the core trivia experience.

**Validation**:
1. Navigate through all app pages - verify consistent use of OKLCH color palette, Inter font, and spacing
2. Hover over buttons and cards - see subtle visual feedback without distracting animations
3. View text content - typography is clear with proper hierarchy (h1, h2, body, muted)
4. View on mobile device - minimal design maintains touch-friendly targets and clear visual hierarchy
5. Check border radius - all interactive elements have consistent 6px rounded corners
6. Verify generous whitespace - sections have py-20, cards have p-6, proper gap values

### Implementation for User Story 3

- [ ] T040 [P] [US3] Audit and update lobby page component in apps/frontend/app/components/ for new color palette
- [ ] T041 [P] [US3] Audit and update game room components in apps/frontend/app/room/components/ for new color palette
- [ ] T042 [P] [US3] Audit and update groups page components in apps/frontend/app/groups/components/ for new color palette
- [ ] T043 [P] [US3] Audit and update leaderboard components in apps/frontend/app/leaderboard/components/ for new color palette
- [ ] T044 [P] [US3] Verify all buttons use bg-primary text-primary-foreground or variant="outline"
- [ ] T045 [P] [US3] Verify all cards use bg-card text-card-foreground with rounded-lg
- [ ] T046 [P] [US3] Verify all inputs use border-input and focus:ring-ring
- [ ] T047 [US3] Update navigation component styling for consistent header design across all pages
- [ ] T048 [US3] Verify typography hierarchy uses proper text sizes (text-5xl for h1, text-3xl for h2, text-xl for large body, text-base for body)
- [ ] T049 [US3] Verify muted text uses text-muted-foreground consistently
- [ ] T050 [US3] Add generous spacing: sections py-20, containers px-4, cards p-6, grid gaps gap-8
- [ ] T051 [US3] Verify touch targets are minimum 44x44px across all interactive elements
- [ ] T052 [US3] Test hover states - verify subtle transitions using transition-colors or transition-transform
- [ ] T053 [US3] Verify logo placement is responsive (horizontal logo on desktop/tablet, square logo on mobile <640px)
- [ ] T054 [US3] Test responsive design at all breakpoints (320px, 640px, 768px, 1024px, 1440px, 2560px)
- [ ] T055 [US3] Verify no horizontal scroll on any breakpoint

**Checkpoint**: All pages should now have the refreshed visual design with consistent styling

---

## Phase 6: User Story 4 - Animation Cleanup (Priority: P3)

**Goal**: Existing unnecessary animations are removed or reduced, with only purposeful micro-interactions remaining (such as button hover states, loading indicators, and game state transitions) to create a polished but understated feel.

**Validation**:
1. Navigate between pages - no unnecessary slide or fade animations
2. Answer a question in game room - feedback is immediate with minimal animation
3. View loading states - simple spinner appears without excessive motion
4. Hover over buttons and cards - subtle quick effects, no heavy animations
5. Check winner banner - no animate-bounce class present
6. Verify only essential animations remain: loading spinners (animate-spin), skeleton loaders (animate-pulse), subtle hover transitions

### Implementation for User Story 4

- [ ] T056 [P] [US4] Search for animate-bounce in apps/frontend/ and remove from winner banner component
- [ ] T057 [P] [US4] Search for animate-slide or slide-in animations in apps/frontend/ and remove from badge/card components
- [ ] T058 [P] [US4] Audit dialog/modal animations in apps/frontend/components/ui/dialog.tsx and simplify to fade-in only
- [ ] T059 [P] [US4] Audit alert-dialog animations in apps/frontend/components/ui/alert-dialog.tsx and simplify to fade-in only
- [ ] T060 [P] [US4] Audit sheet animations in apps/frontend/components/ui/sheet.tsx and simplify transitions
- [ ] T061 [US4] Grep for animate- classes in apps/frontend/ and review each for necessity (keep spin, pulse; remove bounce, others)
- [ ] T062 [US4] Verify loading indicators still use animate-spin (purposeful animation)
- [ ] T063 [US4] Verify skeleton loaders still use animate-pulse (purposeful animation)
- [ ] T064 [US4] Test hover states - ensure transitions are <200ms and subtle
- [ ] T065 [US4] Verify prefers-reduced-motion disables all non-essential animations
- [ ] T066 [US4] Count animation instances - verify 60% reduction from baseline (target: ~6 essential animations)
- [ ] T067 [US4] Test game state transitions - ensure feedback is clear but not distracting

**Checkpoint**: All unnecessary animations removed, only purposeful micro-interactions remain

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements that affect multiple user stories

- [ ] T068 [P] Update README.md with dark mode feature description and theme customization notes
- [ ] T069 [P] Add comments to apps/frontend/app/globals.css explaining OKLCH color system
- [ ] T070 Code cleanup: Remove any console.log statements from theme-related components
- [ ] T071 Code cleanup: Ensure all components follow clean code standards (descriptive names, no TODO comments)
- [ ] T072 Performance: Verify bundle size increase is <500KB using npm run build and analyzing output
- [ ] T073 Performance: Test landing page loads in <2s on throttled 4G connection in Chrome DevTools
- [ ] T074 Accessibility: Run Lighthouse audit on all major pages, verify accessibility score >90
- [ ] T075 Accessibility: Test keyboard navigation through entire app (tab order, focus visible)
- [ ] T076 Accessibility: Test with screen reader (VoiceOver on Mac or NVDA on Windows) on landing page
- [ ] T077 [P] Verify responsive design on real mobile devices (iOS Safari, Android Chrome)
- [ ] T078 [P] Cross-browser testing: Chrome, Firefox, Safari, Edge
- [ ] T079 Run through quickstart.md validation checklist for all testing scenarios
- [ ] T080 Take screenshots of landing page and theme toggle for documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (Landing Page): Can start after Foundational - No dependencies on other stories
  - US2 (Dark Mode): Can start after Foundational - No dependencies on other stories
  - US3 (Visual Design): Can start after Foundational - No dependencies on other stories
  - US4 (Animation Cleanup): Can start after Foundational - No dependencies on other stories
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Landing Page - Independent, can be implemented and tested alone
- **User Story 2 (P2)**: Dark Mode - Independent, can be implemented and tested alone (will verify on landing page from US1)
- **User Story 3 (P1)**: Visual Design - Independent, can be implemented and tested alone (will apply to landing page from US1)
- **User Story 4 (P3)**: Animation Cleanup - Independent, can be implemented and tested alone

**Recommended Order**: US1 → US3 → US2 → US4 (landing page first, then visual refresh, then dark mode, finally animation cleanup)

### Within Each User Story

- **US1**: Component creation [P] → Page composition → Wiring → Responsive testing → Theme testing
- **US2**: Page verification [P] → Accessibility testing → Performance testing
- **US3**: Component audits [P] → Spacing/typography → Responsive testing
- **US4**: Animation removal [P] → Testing reduced motion → Final count verification

### Parallel Opportunities

**Phase 1 (Setup)**: All 3 tasks can run in parallel (T001, T002, T003)

**Phase 2 (Foundational)**: Tasks T005, T006, T010 can run in parallel after T004 completes

**Phase 3 (US1)**: 
- T011, T012, T013, T014 can all run in parallel (different files)

**Phase 4 (US2)**:
- T026, T027, T028, T029, T030 can all run in parallel (verifying different pages)
- T036 can run in parallel with page verifications

**Phase 5 (US3)**:
- T040, T041, T042, T043 can all run in parallel (different component directories)
- T044, T045, T046 can run in parallel (verifying different element types)

**Phase 6 (US4)**:
- T056, T057, T058, T059, T060 can all run in parallel (different files)

**Phase 7 (Polish)**:
- T068, T069 can run in parallel (documentation)
- T077, T078 can run in parallel (different testing environments)

---

## Parallel Example: User Story 1 (Landing Page)

```bash
# Launch all component creation tasks together:
Task T013: "Create HeroSection component in apps/frontend/app/(marketing)/components/hero.tsx"
Task T014: "Create FeaturesSection component in apps/frontend/app/(marketing)/components/features.tsx"

# These can proceed in parallel because they're different files with no dependencies
```

---

## Parallel Example: User Story 3 (Visual Design)

```bash
# Launch all component audit tasks together:
Task T040: "Audit lobby page components"
Task T041: "Audit game room components"  
Task T042: "Audit groups components"
Task T043: "Audit leaderboard components"

# These can proceed in parallel because they're different component directories
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Landing Page)
4. Complete Phase 5: User Story 3 (Visual Design)
5. **STOP and VALIDATE**: Manually test landing page with refreshed design
6. Deploy/demo if ready

This gives you a complete landing page with the new visual design - a solid MVP.

### Incremental Delivery

1. Complete Setup + Foundational → Theme system ready
2. Add User Story 1 (Landing Page) → Manually test → Deploy (MVP: landing page!)
3. Add User Story 3 (Visual Design) → Manually test → Deploy (Refreshed design!)
4. Add User Story 2 (Dark Mode) → Manually test → Deploy (Dark mode support!)
5. Add User Story 4 (Animation Cleanup) → Manually test → Deploy (Polished experience!)
6. Phase 7: Polish → Final validation → Deploy

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

1. **Developer A**: User Story 1 (Landing Page - T011-T025)
2. **Developer B**: User Story 3 (Visual Design - T040-T055)
3. **Developer C**: User Story 2 (Dark Mode - T026-T039)
4. **Developer D**: User Story 4 (Animation Cleanup - T056-T067)

All stories can proceed simultaneously since they're independent.

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story (US1, US2, US3, US4)
- Each user story should be independently completable and manually testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently through manual testing
- Avoid: vague tasks, same file conflicts, cross-story dependencies
- Per constitution: No testing infrastructure - quality assured through code review and manual testing
- **Theme values**: Use the exact OKLCH values provided by user for globals.css (do not modify)
- **Font stack**: Inter (sans), Source Serif 4 (serif), JetBrains Mono (mono)
- **Border radius**: 0.375rem (6px) for consistent rounded corners
- **Spacing scale**: Use Tailwind's spacing (py-20, px-4, gap-8, p-6)

---

## Summary

- **Total Tasks**: 80 tasks
- **Task Breakdown**:
  - Phase 1 (Setup): 3 tasks
  - Phase 2 (Foundational): 7 tasks
  - Phase 3 (US1 - Landing Page): 15 tasks
  - Phase 4 (US2 - Dark Mode): 14 tasks
  - Phase 5 (US3 - Visual Design): 16 tasks
  - Phase 6 (US4 - Animation Cleanup): 12 tasks
  - Phase 7 (Polish): 13 tasks
- **Parallel Opportunities**: 35+ tasks marked [P] for parallel execution
- **Independent Test Criteria**: Each user story has clear validation steps
- **Suggested MVP Scope**: US1 (Landing Page) + US3 (Visual Design) = ~31 tasks
- **Format Validation**: ✅ All tasks follow checklist format (checkbox, ID, labels, file paths)
