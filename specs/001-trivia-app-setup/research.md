# Research: Quizable App Initial Setup

Created: 2025-10-30

## Decisions and Rationale

### Theme management and design tokens
- Decision: Use `next-themes` with `class` strategy and Tailwind CSS variables for light/dark tokens
- Rationale: Minimal JS, SSR-friendly, works with shadcn/ui defaults; easy persistence via localStorage
- Alternatives: CSS `prefers-color-scheme` only (no user toggle); context-only state (no persistence)

### UI components
- Decision: Use shadcn/ui components exclusively
- Rationale: Constitution requires it; accessible, Tailwind-first, low bundle overhead
- Alternatives: MUI/Chakra (rejected per constitution)

### Authentication
- Decision: Use Clerk (`@clerk/clerk-react`) with `ClerkProvider` and route protection
- Rationale: Constitution requires it; reduces security risk and implementation time
- Alternatives: Auth0, custom auth (rejected per constitution)

### Room identifiers
- Decision: UUID v4 for `roomId`
- Rationale: Unambiguous, globally unique, easy backend generation
- Alternatives: 6-digit PINs, alphanumeric codes (acceptable UX but lower entropy)

### Room capacity
- Decision: Max 16 participants
- Rationale: Good UX/layout trade-off for MVP
- Alternatives: 8/32/64/no limit (performance or UX trade-offs)

### Group leaderboard model
- Decision: Rank by total points across sessions
- Rationale: Simple, transparent; extensible with tiebreakers later
- Alternatives: Average score, wins-first, Elo

### Presence and realtime room coordination
- Decision: Cloudflare Durable Objects with WebSockets (one Durable Object per room)
- Rationale: Strong consistency and ordered events per room, built-in concurrency control, low-latency broadcast to participants; scalable without managing servers
- Alternatives: Client polling (simpler but higher latency), Supabase Realtime (good option but adds dependency on row change streams), Pusher/Ably (managed but adds vendor cost), raw WebSocket server (ops burden)

### Data persistence
- Decision: Supabase (Postgres) accessed via `@supabase/supabase-js` from server functions
- Rationale: Managed Postgres with built-in RLS, generous free tier, simple DX; scalable beyond MVP; aligns with "future hosted DB" direction
- Authorization: For MVP, perform DB operations in server functions using the service role key with explicit authorization checks against Clerk session; consider RLS policies keyed by a user identifier in a later iteration
- Alternatives: SQLite (server-only) — simpler locally but less scalable and multi-instance unfriendly; direct Postgres (self-hosted) — higher ops burden

### Group invites
- Decision: Shareable invite link (signed, expiring)
- Rationale: Low friction onboarding; works across platforms
- Alternatives: In-app user search (needs directory), email invites (adds email infra)

### Theme preference persistence
- Decision: `next-themes` localStorage + system default fallback
- Rationale: Simple and standard; aligns with UX expectations
- Alternatives: Persist in user profile (Clerk metadata) — can add later for multi-device sync

## Open Questions Resolved

All NEEDS CLARIFICATION items for planning are resolved above. If future constraints change (hosting limits, DB choice), revisit Data persistence and Presence updates.
