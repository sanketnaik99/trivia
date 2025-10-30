# Data Model: Quizable (Auth + Theme Foundation)

Created: 2025-10-30

## Entities

### User (external via Clerk)
- userId: string (Clerk ID)
- displayName: string
- imageUrl: string

### Theme Preference (stored in browser localStorage via next-themes)
- theme: 'light' | 'dark' | 'system'

## Notes
- Clerk user data is referenced by userId; no local user table required
- Theme preference persisted client-side via next-themes (localStorage)
- No backend persistence needed for this iteration (auth + theme only)
- Rooms, Groups, Sessions, and Leaderboards deferred to future features

