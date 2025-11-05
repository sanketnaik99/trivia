# Research: Authentication, Groups, and Persistent Leaderboards

**Date**: 2025-11-02  
**Feature**: 003-auth-group-leaderboard  
**Phase**: 0 (Outline & Research)

## Purpose

Resolve all NEEDS CLARIFICATION items from Technical Context and justify technology choices for authentication, database, and ORM solutions.

---

## 1. Authentication Provider: Clerk vs Auth.js

### Decision

**Chosen**: Clerk (@clerk/nextjs)

### Rationale

- **Next.js Integration**: First-class middleware support for protecting routes, automatic session management via cookies
- **User Management UI**: Prebuilt sign-in/sign-up components with responsive design (per constitution)
- **Webhooks**: Automatic user sync to our database on user.created, user.updated events
- **Session Handling**: Built-in session management with JWTs, no manual token refresh logic
- **Developer Experience**: TypeScript SDK, excellent documentation, minimal boilerplate

### Alternatives Considered

| Alternative | Pros | Cons | Rejection Reason |
|-------------|------|------|------------------|
| Auth.js (NextAuth) | Open-source, flexible providers | Requires manual DB schema, custom user sync, more boilerplate | More complexity for equivalent functionality; Clerk's webhooks and middleware are superior |
| Custom Auth | Full control, no external dependency | High security risk, time-intensive, session management complexity | Violates time constraints and introduces security liability |
| Supabase Auth | Good Postgres integration | Ties us to Supabase hosting, less Next.js-native | Vendor lock-in; Clerk is more framework-agnostic for future migrations |

### Integration Pattern

- Use Clerk middleware (`@clerk/nextjs/middleware`) to protect authenticated routes
- Use Clerk webhooks to sync user data to Prisma User model (userId from Clerk, display name, avatar)
- Store Clerk userId as primary key in User table for foreign key relationships
- Use `currentUser()` helper in API routes to get authenticated user context

---

## 2. ORM Choice: Prisma vs Alternatives

### Decision

**Chosen**: Prisma (with @prisma/client)

### Rationale

- **Type Safety**: Auto-generated TypeScript types for all models, compile-time query validation
- **Schema-First**: Declarative `schema.prisma` file defines models, relations, and indexes in one place
- **Migrations**: Automatic migration generation and version control (`prisma migrate`)
- **Developer Experience**: Excellent autocomplete, clear error messages, query builder API
- **Clean Code Alignment**: Generated types eliminate manual type definitions, queries are readable and self-documenting

### Alternatives Considered

| Alternative | Pros | Cons | Rejection Reason |
|-------------|------|------|------------------|
| Drizzle | Lightweight, SQL-like syntax | Smaller ecosystem, less mature, fewer learning resources | Prisma's maturity and type generation are superior for team velocity |
| TypeORM | Mature, decorator-based | Heavy dependency footprint, complex configuration, less intuitive API | Violates minimal dependencies principle; less clean than Prisma's schema-first approach |
| Kysely | SQL-first, type-safe | Requires manual schema type definitions, no migration tool | More manual work; Prisma's codegen reduces boilerplate |
| Raw SQL (pg library) | Full control, minimal abstraction | No type safety, error-prone, manual migrations | High risk of SQL injection, no compile-time validation |

### Best Practices

- **Schema Organization**: Single `schema.prisma` file in `apps/backend/src/prisma/`
- **Relations**: Use Prisma's relation syntax (`@relation`) for foreign keys (User ↔ Membership ↔ Group)
- **Indexes**: Add `@@index` for frequently queried fields (groupId, userId, status)
- **Migrations**: Use `prisma migrate dev` for development, `prisma migrate deploy` for production
- **Query Patterns**: Use `include` for relations, `select` for specific fields to optimize payload size

---

## 3. PostgreSQL Hosting Options

### Decision

**Recommended**: Vercel Postgres (for simplicity) or Neon (for flexibility)

### Rationale

- **Vercel Postgres**: Zero-config if deploying to Vercel, automatic connection pooling, free tier sufficient for MVP
- **Neon**: Serverless Postgres, automatic scaling, branching for development environments, generous free tier
- **Local Development**: Use Docker Compose with postgres:16-alpine for consistent local setup

### Alternatives Considered

| Option | Pros | Cons | Use Case |
|--------|------|------|----------|
| Vercel Postgres | Vercel-native, zero config | Vercel-only, limited customization | Best for quick MVP deployment |
| Neon | Serverless, branching, flexible | Requires account setup | Best for team with multiple environments |
| Supabase | Postgres + realtime + auth | More than we need, potential lock-in | Overkill; we only need Postgres |
| Railway | Easy setup, fair pricing | Smaller community than Neon/Vercel | Viable alternative to Neon |
| Self-hosted (Docker) | Full control, cost-effective at scale | Requires DevOps, backup management | Best for production after MVP validation |

### Recommendation

- **Development**: Local Docker Compose postgres container
- **Staging/Production**: Vercel Postgres (if deploying to Vercel) or Neon (for multi-environment flexibility)

---

## 4. Clerk + Prisma Integration Pattern

### Decision

Sync Clerk users to Prisma User model via webhooks

### Rationale

- **Single Source of Truth**: Clerk manages authentication; Prisma manages application data and relationships
- **Webhook Events**: Clerk fires `user.created`, `user.updated`, `user.deleted` events to keep User table in sync
- **Foreign Keys**: Use Clerk userId (string) as primary key in User table to link to Group, Membership, etc.

### Implementation Pattern

```typescript
// apps/backend/src/routes/webhooks.ts
app.post('/api/webhooks/clerk', async (req, res) => {
  const event = req.body;
  
  if (event.type === 'user.created') {
    await prisma.user.create({
      data: {
        id: event.data.id, // Clerk userId
        email: event.data.email_addresses[0].email_address,
        displayName: event.data.first_name || event.data.username,
        avatarUrl: event.data.image_url,
      },
    });
  }
  
  // Handle user.updated, user.deleted...
  
  res.json({ received: true });
});
```

### Best Practices

- **Idempotency**: Check if user exists before creating (handle duplicate webhook deliveries)
- **Validation**: Verify webhook signature using Clerk's `verifyWebhook` utility
- **Error Handling**: Log failures, implement retry mechanism for critical operations

---

## 5. Performance & Scale: Resolved Clarifications

### Concurrent User Count

**Assumption**: 100-500 concurrent users for MVP, scaling to 1,000+ post-validation

**Impact**:
- Database connection pooling: Set Prisma connection limit to 10-20 for MVP
- WebSocket scaling: Single backend instance sufficient for MVP; plan for horizontal scaling with Redis adapter if >500 concurrent

### Group & Invite Constraints

**Decisions**:
- **Max Group Size**: 100 members (soft limit, enforced in UI and backend validation)
- **Max Invite Lifetime**: 7 days default, configurable per group (1-30 days)
- **Rate Limits**: 
  - Invite generation: 10 per hour per admin
  - Group creation: 5 per day per user
- **Groups per User**: No hard limit, but UI pagination at 20 groups per page

**Rationale**:
- 100 members aligns with typical friend-group size; prevents abuse and maintains leaderboard readability
- 7-day invite expiry balances usability (time to share) with security (stale links)
- Rate limits prevent spam and abuse without hindering legitimate use

### Games per Group per Day

**Assumption**: 5-50 games per group per day

**Impact**:
- Leaderboard aggregation: Simple SUM query sufficient; no need for materialized views at this scale
- Index strategy: Composite index on (groupId, completedAt) for efficient queries
- Real-time updates: Broadcast leaderboard changes via WebSocket on game completion

---

## 6. Database Schema Design Considerations

### Key Patterns

- **Soft Deletes**: Use `status` enum (ACTIVE, INACTIVE, DELETED) instead of hard deletes for Groups and Memberships to preserve leaderboard history
- **Timestamps**: Include `createdAt`, `updatedAt` on all models for audit trails
- **Enums**: Use Prisma enums for role (ADMIN, MEMBER), invite status (ACTIVE, REVOKED, USED, EXPIRED)
- **Composite Keys**: Use `@@unique([userId, groupId])` on Membership to prevent duplicate memberships

### Performance Optimizations

- **Indexes**: 
  - `Group`: `@@index([createdBy])`
  - `Membership`: `@@index([groupId])`, `@@index([userId])`
  - `GroupInvite`: `@@index([groupId])`, `@@index([token])`
  - `GroupLeaderboardEntry`: `@@index([groupId, totalPoints DESC])`
- **Pagination**: Use cursor-based pagination (`cursor`, `take`) for groups list and leaderboard
- **Aggregation**: Denormalize leaderboard totals in GroupLeaderboardEntry table, updated on game completion

---

## 7. WebSocket Integration for Real-Time Updates

### Decision

Extend existing Socket.IO implementation to support group-affiliated rooms and leaderboard broadcasts

### Rationale

- **Existing Infrastructure**: apps/backend already uses Socket.IO; extend handlers rather than introduce new dependency
- **Real-Time Requirement**: Spec SC-003 mandates <5s leaderboard updates; WebSocket push is most efficient

### Integration Pattern

```typescript
// On game completion in group room:
socket.on('game:complete', async (roomId, results) => {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { group: true } });
  
  if (room.groupId) {
    // Update leaderboard entries
    for (const result of results) {
      await prisma.groupLeaderboardEntry.upsert({
        where: { groupId_userId: { groupId: room.groupId, userId: result.userId } },
        update: { totalPoints: { increment: result.points } },
        create: { groupId: room.groupId, userId: result.userId, totalPoints: result.points },
      });
    }
    
    // Broadcast updated leaderboard to group members
    const leaderboard = await prisma.groupLeaderboardEntry.findMany({
      where: { groupId: room.groupId },
      orderBy: { totalPoints: 'desc' },
      include: { user: { select: { displayName: true, avatarUrl: true } } },
    });
    
    io.to(`group:${room.groupId}`).emit('leaderboard:updated', leaderboard);
  }
});
```

### Best Practices

- **Room Joining**: Auto-join users to `group:{groupId}` room when viewing group page
- **Payload Size**: Send only top 50 leaderboard entries in real-time updates; full list fetched on demand
- **Error Handling**: Fallback to REST API polling if WebSocket connection fails

---

## Summary of Resolved Clarifications

| Item | Resolution |
|------|-----------|
| Concurrent user count | 100-500 MVP, 1,000+ post-validation |
| Max group size | 100 members (soft limit) |
| Max invite lifetime | 7 days default (1-30 days configurable) |
| Rate limits | Invites: 10/hour/admin; Groups: 5/day/user |
| Groups per user | Unlimited, paginated at 20/page |
| Games per group/day | 5-50 expected; schema optimized for this scale |

---

## Technology Stack Summary

| Component | Technology | Justification |
|-----------|-----------|---------------|
| Authentication | Clerk (@clerk/nextjs) | Best Next.js integration, webhooks, prebuilt UI |
| Database | PostgreSQL | Industry-standard, ACID compliance, excellent Prisma support |
| ORM | Prisma | Type safety, migrations, clean code alignment |
| Hosting (Dev) | Docker Compose | Consistent local environment |
| Hosting (Prod) | Vercel Postgres or Neon | Zero-config or flexible branching |
| Real-Time | Socket.IO (existing) | Extend existing backend, proven in project |

---

## Next Steps (Phase 1)

1. Generate `data-model.md` with Prisma schema definitions
2. Create API contracts in `/contracts/` (REST endpoints, WebSocket events)
3. Write `quickstart.md` with setup instructions for Clerk, Postgres, Prisma
4. Update agent context with new technologies

**Phase 0 Complete**: All NEEDS CLARIFICATION items resolved, technology choices documented and justified.
