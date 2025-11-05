# Implementation Plan: Authentication, Groups, and Persistent Leaderboards

**Branch**: `003-auth-group-leaderboard` | **Date**: 2025-11-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-auth-group-leaderboard/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add user authentication (Clerk), private group management with invite system, and persistent group leaderboards that aggregate trivia room points. Technical approach: Clerk for auth, Postgres + Prisma for persistent storage, Next.js App Router for frontend, REST + WebSocket for real-time updates.

## Technical Context

**Language/Version**: TypeScript 5+, Node.js 18+, Next.js 16.0.1, React 19.2.0  
**Primary Dependencies**: 
- Core: Next.js, React, Tailwind CSS, shadcn/ui (per constitution)
- Auth: Clerk (@clerk/nextjs) - NEW for this feature
- Database: Prisma (ORM), @prisma/client, PostgreSQL - NEW for this feature
- WebSocket: Socket.io-client (frontend) - already present in project

**Storage**: PostgreSQL (hosted or local) with Prisma ORM for schema management and migrations  
**Testing**: NONE (per constitution - no testing infrastructure)  
**Target Platform**: Web (responsive: mobile 320px+, tablet 768px+, desktop 1024px+)  
**Project Type**: Next.js App Router (app/ directory) with separate Express + Socket.IO backend (apps/backend/)  
**Performance Goals**: 
- <2s initial page load for authenticated routes
- <5s group leaderboard update after game completion (per spec SC-003)
- [NEEDS CLARIFICATION: expected concurrent user count for capacity planning]

**Constraints**: 
- Email/password auth via Clerk (social sign-in deferred per spec assumptions)
- Private groups only; no public discovery (per spec)
- Multiple group membership supported (per spec FR-014)
- [NEEDS CLARIFICATION: max group size, max invite lifetime, rate limits for invite generation]

**Scale/Scope**: 
- New DB entities: User, Group, Membership, GroupInvite, GroupLeaderboardEntry
- Extend existing Room entity with groupId, createdBy
- UI pages: sign-in/sign-up, groups list, group detail, group leaderboard
- [NEEDS CLARIFICATION: expected number of groups per user, games per group per day]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Clean Code**: Feature maintains clean code standards; Prisma models are declarative with schema-first design, Clerk integration uses official SDK patterns, REST endpoints follow RESTful conventions, modular service layer for business logic.
- [x] **Simple & Elegant UI**: UI additions (sign-in, groups list, group leaderboard) leverage Clerk's prebuilt responsive components (SignInButton, UserButton), shadcn/ui card/button primitives, and minimal custom styling.
- [x] **Responsive Design**: All new UI pages use Tailwind breakpoints (320px+ mobile, 768px+ tablet, 1024px+ desktop); Clerk components are responsive by default; leaderboard tables adapt using shadcn/ui responsive patterns.
- [x] **Minimal Dependencies**: NEW dependencies justified in research.md—Clerk (robust auth + security), Prisma (type safety + migrations), Postgres (persistent storage per spec FR-016). All integrate cleanly with existing Next.js stack.
- [x] **No Testing**: Confirmed—no test infrastructure added; manual testing via quickstart.md procedures and Prisma Studio for DB inspection.
- [x] **Next.js + Tailwind + shadcn/ui**: Implementation uses required stack; Clerk middleware integrates with Next.js App Router, Prisma ORM used in backend API routes, shadcn/ui components for all UI elements.

**Complexity Justifications**: 
- Clerk dependency: required for robust auth with session management, no viable in-house alternative given timeline and security requirements.
- Prisma + PostgreSQL: required for persistent storage of users, groups, memberships, invites, leaderboard aggregates; in-memory storage insufficient per spec (FR-016: retain data across sessions).

**Phase 0 Research Tasks**:
- Justify Prisma vs raw SQL / Drizzle / TypeORM
- Justify Clerk vs Auth.js (formerly NextAuth) / custom auth
- Research Clerk + Prisma integration patterns (user sync, metadata storage)
- Research PostgreSQL hosting options (Vercel Postgres, Supabase, Neon, self-hosted)

## Project Structure

### Documentation (this feature)

```text
specs/003-auth-group-leaderboard/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── http-api.md      # REST endpoints for auth, groups, invites
│   └── socketio-events.md # Real-time events (extend existing for group rooms)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/
├── backend/            # Express + Socket.IO server (EXISTING)
│   ├── src/
│   │   ├── prisma/     # NEW: Prisma schema and migrations
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── routes/     # EXTEND: add auth, group, invite routes
│   │   ├── services/   # EXTEND: add group.service, leaderboard.service
│   │   ├── socket/     # EXTEND: add auth checks, group room handlers
│   │   ├── middleware/ # NEW: auth middleware, clerk webhook handlers
│   │   └── types/      # EXTEND: add group, membership types
│   └── package.json    # ADD: prisma, @prisma/client, @clerk/backend
│
└── frontend/           # Next.js App Router (EXISTING)
    ├── app/
    │   ├── sign-in/    # NEW: Clerk sign-in page
    │   ├── sign-up/    # NEW: Clerk sign-up page
    │   ├── groups/     # NEW: groups list, create group
    │   ├── group/
    │   │   └── [id]/   # NEW: group detail, leaderboard, manage members
    │   ├── components/ # EXTEND: add group cards, leaderboard tables
    │   ├── lib/        # EXTEND: add clerk helpers, group API client
    │   └── middleware.ts # NEW: Clerk auth middleware
    ├── components/
    │   └── ui/         # EXISTING: shadcn/ui components
    └── package.json    # ADD: @clerk/nextjs

.env.local              # NEW: CLERK_SECRET_KEY, DATABASE_URL, etc.
```

**Structure Decision**: Monorepo structure with separate apps/backend (Express + Socket.IO + Prisma) and apps/frontend (Next.js + Clerk). Backend handles DB operations and WebSocket; frontend handles UI and auth flow. Prisma schema lives in apps/backend/src/prisma/ to colocate with backend services.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Minimal Dependencies: Clerk | Robust auth with session management, webhooks for user sync, middleware integration | Custom auth: high security risk, time-consuming; Auth.js: requires custom user sync, less integrated with Next.js middleware |
| Minimal Dependencies: Prisma + Postgres | Persistent storage mandated by spec (FR-016), type-safe queries, schema migrations | In-memory: violates persistence requirement; Raw SQL: error-prone, no type safety; Other ORMs: Prisma best-in-class for TypeScript |
