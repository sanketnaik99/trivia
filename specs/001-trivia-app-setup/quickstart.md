# Quizable Quickstart (Feature 001: Auth + Theme Foundation)

This guide covers running the app with Clerk auth and theme support via next-themes.

## Prerequisites
- Node 18+
- A Clerk application (Frontend API and Publishable Key)

## Environment
Create `.env.local` with:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
```

## Install & Run

```bash
npm install
npm run dev
```

App will start with Vite. Sign-in components use Clerk. Theme toggle uses next-themes (class strategy) and Tailwind tokens.

## Notes
- No automated tests are required for this feature
- **Out of scope for this iteration**: Rooms, Groups, Supabase persistence, Cloudflare Durable Objects (deferred to future features)
