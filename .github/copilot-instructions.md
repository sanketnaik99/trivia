# trivia Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-30

## Active Technologies
- TypeScript 5.x, React 19.2, Node 18+ (Vite) + @tanstack/react-start, @tanstack/react-router, @tanstack/react-query, shadcn/ui, tailwindcss, next-themes, @clerk/clerk-react, class-variance-authority, clsx, tailwind-merge, lucide-reac (001-trivia-app-setup)
- SQLite via better-sqlite3 (server-only) with a small data access layer; future option to swap to hosted DB (001-trivia-app-setup)
- TypeScript 5.x, React 19.2, Node 18+ (Vite) + @tanstack/react-start, @tanstack/react-router, @tanstack/react-query, shadcn/ui, tailwindcss, next-themes, @clerk/clerk-react, class-variance-authority, clsx, tailwind-merge, lucide-react, @supabase/supabase-js (001-trivia-app-setup)
- Supabase (Postgres) with Row Level Security (RLS); server functions use supabase-js with service role for privileged ops and user-scoped authorization via Clerk session (001-trivia-app-setup)
- TypeScript 5.x, React 19.2, Node 18+ (Vite) + @tanstack/react-start, @tanstack/react-router, shadcn/ui, tailwindcss, next-themes, @clerk/clerk-react, class-variance-authority, clsx, tailwind-merge, lucide-reac (001-trivia-app-setup)
- N/A (no persistence needed for auth + theme; deferred to future features) (001-trivia-app-setup)

- (001-trivia-app-setup)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

# Add commands for 

## Code Style

: Follow standard conventions

## Recent Changes
- 001-trivia-app-setup: Added TypeScript 5.x, React 19.2, Node 18+ (Vite) + @tanstack/react-start, @tanstack/react-router, shadcn/ui, tailwindcss, next-themes, @clerk/clerk-react, class-variance-authority, clsx, tailwind-merge, lucide-reac
- 001-trivia-app-setup: Added TypeScript 5.x, React 19.2, Node 18+ (Vite) + @tanstack/react-start, @tanstack/react-router, @tanstack/react-query, shadcn/ui, tailwindcss, next-themes, @clerk/clerk-react, class-variance-authority, clsx, tailwind-merge, lucide-react, @supabase/supabase-js
- 001-trivia-app-setup: Added TypeScript 5.x, React 19.2, Node 18+ (Vite) + @tanstack/react-start, @tanstack/react-router, @tanstack/react-query, shadcn/ui, tailwindcss, next-themes, @clerk/clerk-react, class-variance-authority, clsx, tailwind-merge, lucide-react, @supabase/supabase-js


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
