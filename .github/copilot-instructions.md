# trivia Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-30

## Active Technologies
- TypeScript 5+, Node.js 18+, Next.js 16.0.1, React 19.2.0 (002-express-socketio-migration)
- In-memory (Map-based room storage, 5-minute timeout, 100-room limit) (002-express-socketio-migration)
- PostgreSQL (hosted or local) with Prisma ORM for schema management and migrations (003-auth-group-leaderboard)
- TypeScript 5+, Node.js 18+, Next.js 16.0.1, React 19.2.0 + Next.js, React, Tailwind CSS 4.0, shadcn/ui, @clerk/nextjs (auth), Socket.IO clien (004-ui-redesign-dark-mode)
- Browser localStorage (theme preference only - no backend changes) (004-ui-redesign-dark-mode)
- TypeScript 5+, Node.js 18+, Next.js 16.0.1, React 19.2.0 + Next.js, React, Tailwind CSS 4.0, shadcn/ui, @clerk/nextjs (auth), Socket.IO client, next-themes (theme management) (004-ui-redesign-dark-mode)
- Browser localStorage via next-themes (theme preference only - no backend changes) (004-ui-redesign-dark-mode)

- TypeScript 5+, Next.js 16.0.1, React 19.2.0 (001-trivia-room-system)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5+, Next.js 16.0.1, React 19.2.0: Follow standard conventions

### Code Quality Rules

1. **No Task/Ticket Comments**: Never add comments like `// T077: Add feature` or `// TODO: Implement`. If you see any, delete them.
2. **Self-Documenting Code**: Write clear, descriptive variable/function names instead of adding explanatory comments.
3. **Comments Only for Why, Not What**: Only add comments to explain complex business logic or non-obvious decisions, never to describe what the code does.

## Recent Changes
- 004-ui-redesign-dark-mode: Added TypeScript 5+, Node.js 18+, Next.js 16.0.1, React 19.2.0 + Next.js, React, Tailwind CSS 4.0, shadcn/ui, @clerk/nextjs (auth), Socket.IO client, next-themes (theme management)
- 004-ui-redesign-dark-mode: Added TypeScript 5+, Node.js 18+, Next.js 16.0.1, React 19.2.0 + Next.js, React, Tailwind CSS 4.0, shadcn/ui, @clerk/nextjs (auth), Socket.IO clien
- 003-auth-group-leaderboard: Added TypeScript 5+, Node.js 18+, Next.js 16.0.1, React 19.2.0


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
