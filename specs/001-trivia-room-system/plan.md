# Implementation Plan: Trivia Room System

**Branch**: `001-trivia-room-system` | **Date**: 2025-10-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-trivia-room-system/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a real-time multiplayer trivia game where users create/join rooms, ready up to start synchronized gameplay, answer timed questions, and see round winners based on fastest correct answers. Technical approach uses Next.js with WebSockets and Cloudflare Durable Objects for real-time state synchronization, 10 hardcoded questions for MVP, and fully responsive UI built with Tailwind and shadcn/ui.

## Technical Context

**Language/Version**: TypeScript 5+, Next.js 16.0.1, React 19.2.0  
**Primary Dependencies**: Next.js, React, Tailwind CSS 4, shadcn/ui, Native WebSocket API (browser built-in), Cloudflare Durable Objects SDK, Wrangler CLI (development/deployment)  
**Storage**: Cloudflare Durable Objects for room state (in-memory with automatic persistence)  
**Testing**: NONE (per constitution - no testing infrastructure)  
**Target Platform**: Web (responsive: mobile 320px+, tablet 768px+, desktop 1024px+)
**Project Type**: Next.js App Router with API routes + Cloudflare Workers (Durable Objects)
**Performance Goals**: <3s initial page load, <2s real-time update latency, <1s question sync across clients, smooth 60fps animations  
**Constraints**: WebSocket connection stability required, 2-8 players per room, timer drift <2s across devices, mobile-first design  
**Scale/Scope**: Target 100 concurrent rooms for MVP, designed to scale to 1000+ rooms via Durable Objects architecture, 10 hardcoded questions, 5 prioritized user stories, ~8-12 main components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Clean Code**: Does this feature maintain clean, readable code standards?
  - ✅ Component-based architecture with single responsibility
  - ✅ TypeScript for type safety and self-documenting code
  - ✅ Clear separation: UI components, business logic, WebSocket handling
  
- [x] **Simple & Elegant UI**: Does the UI design prioritize simplicity and elegance?
  - ✅ Minimal screens: Home → Room Lobby → Game → Results
  - ✅ Clear visual hierarchy: room code prominent, timer visible, results clear
  - ✅ Intuitive interactions: click to ready, select and submit answer
  
- [x] **Responsive Design**: Is responsive design across all device sizes planned?
  - ✅ Mobile-first approach (320px base)
  - ✅ Tailwind breakpoints for tablet (768px) and desktop (1024px)
  - ✅ Touch-friendly UI elements (44x44px minimum tap targets)
  
- [x] **Minimal Dependencies**: Are new dependencies justified and minimal?
  - ✅ Next.js, React, Tailwind, shadcn/ui: Required by constitution
  - ⚠️ WebSocket library: Required for real-time sync (to be researched)
  - ⚠️ Cloudflare Wrangler: Required for Durable Objects deployment
  - ✅ No testing frameworks (per constitution)
  
- [x] **No Testing**: Confirm no test infrastructure is planned (this is correct per constitution)
  - ✅ No Jest, Vitest, Playwright, Cypress, or similar
  - ✅ Quality assured through code review and manual testing
  
- [x] **Next.js + Tailwind + shadcn/ui**: Does the implementation use the required tech stack?
  - ✅ Next.js 16.0.1 App Router
  - ✅ Tailwind CSS 4
  - ✅ shadcn/ui for Button, Input, Card, Badge components

**Complexity Justifications**: 
- WebSocket/Durable Objects dependency justified: Real-time sync is core requirement (FR-022)
- Cloudflare Workers infrastructure: Necessary for Durable Objects, adds deployment complexity but provides stateful WebSocket handling

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── (game)/                      # Route group for game pages
│   ├── room/
│   │   └── [code]/
│   │       └── page.tsx        # Room lobby and gameplay
│   └── results/
│       └── page.tsx            # Round results screen
├── components/                  # Shared components
│   ├── room-lobby.tsx          # Participant list, ready status
│   ├── game-question.tsx       # Question display, answer options, timer
│   ├── round-results.tsx       # Winner, correct answer, player stats
│   ├── create-room-form.tsx    # Room creation UI
│   └── join-room-form.tsx      # Room code input
├── lib/                        # Utilities and helpers
│   ├── websocket.ts            # WebSocket client connection handler
│   ├── room-state.ts           # Room state types and utilities
│   ├── questions.ts            # Hardcoded 10 questions array
│   └── utils.ts                # Helper functions
├── api/                        # API routes
│   └── room/
│       ├── create/
│       │   └── route.ts        # POST - create new room
│       └── [code]/
│           └── route.ts        # GET - validate room exists
├── globals.css                 # Global styles
├── layout.tsx                  # Root layout
└── page.tsx                    # Home page (create/join)

components/
└── ui/                         # shadcn/ui components
    ├── button.tsx
    ├── input.tsx
    ├── card.tsx
    ├── badge.tsx
    └── ...

public/                         # Static assets
└── (empty for now)

workers/                        # Cloudflare Workers (Durable Objects)
├── room-durable-object.ts      # Durable Object for room state
└── websocket-handler.ts        # WebSocket connection handler
```

**Structure Decision**: Using Next.js App Router (Option 1) with Cloudflare Workers for Durable Objects. The app/ directory contains all frontend routes and components. The workers/ directory contains Cloudflare-specific code for Durable Objects and WebSocket handling. This structure keeps frontend and backend concerns separated while maintaining Next.js conventions.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations** - All constitution checks passed.

---

## Phase Summary

### Phase 0: Research ✅ Complete

**Deliverable**: `research.md`

**Resolved**:
- WebSocket client library: Native WebSocket API (zero dependencies)
- Durable Objects integration: Hybrid Next.js + Cloudflare Workers architecture
- Concurrent room scaling: Target 100, design for 1000+
- Best practices documented for WebSocket, responsive design, timer sync, room codes

### Phase 1: Design ✅ Complete

**Deliverables**:
- `data-model.md` - 6 core entities with validation rules
- `contracts/http-api.md` - 3 HTTP endpoints
- `contracts/websocket-protocol.md` - 9 message types (4 client→server, 5 server→client)
- `quickstart.md` - Development setup and testing workflows
- `.github/copilot-instructions.md` - Updated agent context

**Key Decisions**:
- Room: 6-character codes, 2-8 players, 3 states (lobby/active/results)
- Questions: 10 hardcoded questions for MVP
- Real-time: WebSocket with Durable Objects, server-authoritative timer
- API: Create room, join room, validate room (HTTP) + WebSocket for game

### Phase 2: Tasks (Next Step)

**Command**: `/speckit.tasks`

**Will Generate**: `tasks.md` with implementation tasks organized by user story:
- Phase 1: Setup (Next.js + Cloudflare Workers initialization)
- Phase 2: Foundational (routing, WebSocket, base components)
- Phase 3: US1 - Create and Join Rooms
- Phase 4: US2 - Ready Up and Start Game
- Phase 5: US3 - Answer Questions with Timer
- Phase 6: US4 - Determine Round Winner
- Phase 7: US5 - Continue or End Game
- Phase 8: Polish (responsive design, clean code review)

---

## Implementation Readiness

✅ **Constitution Compliance**: All gates passed  
✅ **Technical Unknowns**: Resolved via research  
✅ **Data Model**: 6 entities defined with validation  
✅ **API Contracts**: HTTP + WebSocket protocols complete  
✅ **Development Guide**: Quickstart ready for testing  
✅ **Agent Context**: Updated for AI-assisted development

**Status**: Ready for `/speckit.tasks` to generate implementation tasks

---

## Quick Reference

**Branch**: `001-trivia-room-system`  
**Spec**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md)  
**Data Model**: [data-model.md](./data-model.md)  
**Contracts**: [contracts/](./contracts/)  
**Quickstart**: [quickstart.md](./quickstart.md)

**Tech Stack**: Next.js 16 + React 19 + TypeScript 5 + Tailwind 4 + shadcn/ui + Cloudflare Durable Objects
