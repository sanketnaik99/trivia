---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Per project constitution, this project does NOT include testing infrastructure. Quality assurance is performed through code review and manual testing.

**Organization**: Tasks are grouped by user story to enable independent implementation of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

<!-- 
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.
  
  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/
  
  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment
  
  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create Next.js project structure per implementation plan
- [ ] T002 Install and configure required dependencies (Next.js, Tailwind, shadcn/ui)
- [ ] T003 [P] Configure TypeScript and ESLint
- [ ] T004 [P] Setup Tailwind CSS configuration
- [ ] T005 [P] Initialize shadcn/ui components

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T006 Setup routing structure in Next.js App Router
- [ ] T007 [P] Create base layout and navigation components
- [ ] T008 [P] Setup responsive design utilities and breakpoints
- [ ] T009 Configure global styles and theme
- [ ] T010 Create reusable UI components from shadcn/ui
- [ ] T011 Setup error handling and loading states

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Validation**: [How to manually verify this story works - specify exact user actions to test]

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create [Component] UI component in app/components/[name].tsx
- [ ] T013 [P] [US1] Create [Component] using shadcn/ui primitives
- [ ] T014 [US1] Implement [feature logic] in app/lib/[name].ts
- [ ] T015 [US1] Create responsive layout for [feature] (mobile, tablet, desktop)
- [ ] T016 [US1] Add proper TypeScript types for [feature]
- [ ] T017 [US1] Implement error handling and loading states
- [ ] T018 [US1] Verify clean code standards and refactor if needed

**Checkpoint**: At this point, User Story 1 should be fully functional and manually testable

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Validation**: [How to manually verify this story works - specify exact user actions to test]

### Implementation for User Story 2

- [ ] T019 [P] [US2] Create [Component] UI component in app/components/[name].tsx
- [ ] T020 [US2] Implement [feature logic] in app/lib/[name].ts
- [ ] T021 [US2] Create responsive layout for [feature]
- [ ] T022 [US2] Integrate with User Story 1 components (if needed)
- [ ] T023 [US2] Verify clean code standards and refactor if needed

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Validation**: [How to manually verify this story works - specify exact user actions to test]

### Implementation for User Story 3

- [ ] T024 [P] [US3] Create [Component] UI component in app/components/[name].tsx
- [ ] T025 [US3] Implement [feature logic] in app/lib/[name].ts
- [ ] T026 [US3] Create responsive layout for [feature]
- [ ] T027 [US3] Verify clean code standards and refactor if needed

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in docs/
- [ ] TXXX Code cleanup and refactoring for clean code standards
- [ ] TXXX Performance optimization across all stories
- [ ] TXXX Responsive design verification on all device sizes
- [ ] TXXX Accessibility improvements
- [ ] TXXX Bundle size optimization
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- UI components before business logic
- Business logic before integration
- Core implementation before responsive design refinements
- Story complete and manually verified before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- UI components within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all UI components for User Story 1 together:
Task: "Create [Component1] UI component in app/components/[name].tsx"
Task: "Create [Component2] UI component in app/components/[name].tsx"

# Launch business logic tasks together:
Task: "Implement [feature1 logic] in app/lib/[name].ts"
Task: "Implement [feature2 logic] in app/lib/[name].ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Manually test User Story 1 thoroughly
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Manually test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Manually test independently → Deploy/Demo
4. Add User Story 3 → Manually test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and manually testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently through manual testing
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Per constitution: No testing infrastructure - quality assured through code review and manual testing
