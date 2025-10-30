# Quizable Quickstart (Feature 001)

This guide covers running the app with Clerk auth, Tailwind + shadcn/ui, and theme support via next-themes.

## Prerequisites
- Node 18+
- A Clerk application (Frontend API and Publishable Key)

## Environment
Create `.env.local` with:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # server-only, NEVER expose to browser
```

Notes:
- The SERVICE_ROLE key must only be accessed from server functions (never client-side)
- For MVP, server functions will authorize using Clerk session and perform DB ops with service role

## Cloudflare (Realtime via Durable Objects)

Prerequisites:
- Install Wrangler: `npm i -g wrangler`
- Cloudflare account and `account_id`

Recommended wrangler.toml (example):

```toml
name = "quizable-realtime"
main = "src/worker.ts"
compatibility_date = "2025-10-30"

[durable_objects]
bindings = [
	{ name = "ROOMS", class_name = "RoomDO" }
]

[[migrations]]
tag = "v1"
new_classes = ["RoomDO"]
```

Run locally:
- `wrangler dev`

The app connects to `wss://<worker>/ws/rooms/{roomId}` as defined in `contracts/realtime.md`.

## Install & Run

```bash
npm install
npm run dev
```

App will start with Vite. Sign-in components use Clerk. Theme toggle uses next-themes (class strategy) and Tailwind tokens.

## Notes
- No automated tests are required for this feature
- Rooms use UUID identifiers; max 16 participants
- Leaderboards rank by total points across sessions
