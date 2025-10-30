# Implementation Plan: Quizable App Initial Setup

**Branch**: `001-trivia-app-setup` | **Date**: 2025-10-30 | **Spec**: [/specs/001-trivia-app-setup/spec.md](/specs/001-trivia-app-setup/spec.md)
**Input**: Feature specification from `/specs/001-trivia-app-setup/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement the initial Quizable feature set: Clerk-gated authentication; authenticated users land on Home to host or join a room (UUID, max 16 participants); create Groups with persistent leaderboards ranked by total points; provide light/dark theme toggle. Technical approach: TanStack Start (SSR + SPA) with TanStack Router/Query, shadcn/ui on Tailwind; theme via Tailwind design tokens and next-themes (class strategy); Clerk for auth; persistence via Supabase (Postgres) accessed from server functions; realtime presence and room coordination via Cloudflare Durable Objects with WebSockets.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x, React 19.2, Node 18+ (Vite)
**Primary Dependencies**: @tanstack/react-start, @tanstack/react-router, @tanstack/react-query, shadcn/ui, tailwindcss, next-themes, @clerk/clerk-react, class-variance-authority, clsx, tailwind-merge, lucide-react, @supabase/supabase-js
**Storage**: Supabase (Postgres) with Row Level Security (RLS); server functions use supabase-js with service role for privileged ops and user-scoped authorization via Clerk session
**Realtime/Coordination**: Cloudflare Durable Objects (one object per room) handling WebSocket connections, presence lists, and fanout; TanStack Start app connects over WS
**Testing**: No unit, integration, or e2e tests required (per constitution and user input)
**Target Platform**: Web app (SSR + SPA) on TanStack Start
**Project Type**: Single web project (frontend + server functions in one repo)
**Performance Goals**: From spec success criteria (home load <2s, theme apply <1s, host/join <15s)
**Constraints**: Room capacity 16; UUID room IDs; auth-gated routes; leaderboard ranks by total points
**Scale/Scope**: MVP target ~100 concurrent rooms, ~1k concurrent users; Durable Objects provide ordered, single-shard coordination per room; Supabase free-tier friendly

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- TanStack Start framework: COMPLIANT (routing/data via TanStack)
- shadcn/ui components: COMPLIANT (all UI via shadcn + Tailwind)
- Tailwind CSS for styling: COMPLIANT (utility-first; theme via CSS vars)
- Clerk authentication: COMPLIANT (ClerkProvider, protected routes)
- No testing requirements: COMPLIANT (manual acceptance only)

Gate status: PASS

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
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
Single project (TanStack Start app):
.
├── package.json
├── vite.config.ts
├── src/
│   ├── routes/
│   │   ├── __root.tsx
│   │   └── index.tsx
│   ├── components/
│   │   └── Header.tsx
│   ├── integrations/
│   │   ├── clerk/
│   │   │   ├── header-user.tsx
│   │   │   └── provider.tsx
│   │   └── tanstack-query/
│   │       ├── devtools.tsx
│   │       └── root-provider.tsx
│   ├── lib/
│   │   └── utils.ts
│   ├── data/
│   ├── router.tsx
│   └── styles.css
└── specs/001-trivia-app-setup/ (planning docs)
```

**Structure Decision**: Use the existing single-project TanStack Start structure. Server functions and data access layer will reside alongside routes/components as appropriate (e.g., in `src/routes/api/*` or colocation with feature routes).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |
