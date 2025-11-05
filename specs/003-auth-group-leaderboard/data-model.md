# Data Model: Authentication, Groups, and Persistent Leaderboards

**Date**: 2025-11-02  
**Feature**: 003-auth-group-leaderboard  
**Phase**: 1 (Design & Contracts)

## Purpose

Define database schema, entity relationships, validation rules, and state transitions for authentication, groups, memberships, invites, and leaderboard persistence.

---

## Entity Relationship Diagram

```text
┌──────────────┐
│     User     │ (Synced from Clerk via webhook)
│--------------│
│ id (PK)      │ ← Clerk userId (string)
│ email        │
│ displayName  │
│ avatarUrl    │
│ createdAt    │
│ updatedAt    │
└──────┬───────┘
       │
       │ 1:N (created groups)
       ├────────────────┐
       │                │
       │                ▼
       │          ┌──────────────┐
       │          │    Group     │
       │          │--------------│
       │          │ id (PK)      │
       │          │ name         │
       │          │ createdBy    │ → User.id (FK)
       │          │ privacy      │ (enum: PRIVATE)
       │          │ createdAt    │
       │          │ updatedAt    │
       │          └──────┬───────┘
       │                 │
       │                 │ 1:N
       │                 ├─────────────────┬──────────────────┐
       │                 │                 │                  │
       │                 ▼                 ▼                  ▼
       │          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
       │          │ Membership   │  │ GroupInvite  │  │GroupLeaderboard
       │          │--------------│  │--------------│  │    Entry     │
       │          │ id (PK)      │  │ id (PK)      │  │--------------│
       │          │ userId       │─ │ groupId      │  │ id (PK)      │
       │          │ groupId      │  │ token        │  │ groupId      │
       │          │ role         │  │ createdBy    │  │ userId       │
       │          │ joinedAt     │  │ expiresAt    │  │ totalPoints  │
       │          │ status       │  │ status       │  │ lastUpdated  │
       │          └──────────────┘  │ createdAt    │  └──────────────┘
       │                             └──────────────┘
       │
       │ 1:N (rooms created by user)
       │
       └────────────────────────────────────────────┐
                                                    │
                                                    ▼
                                             ┌──────────────┐
                                             │     Room     │ (EXTEND existing)
                                             │--------------│
                                             │ id (PK)      │
                                             │ code         │
                                             │ groupId      │ → Group.id (FK, nullable)
                                             │ createdBy    │ → User.id (FK, nullable)
                                             │ ... (existing fields)
                                             └──────────────┘
```

---

## Prisma Schema

### Location
`apps/backend/src/prisma/schema.prisma`

### Full Schema Definition

```prisma
// Prisma schema for Authentication, Groups, and Persistent Leaderboards
// Feature: 003-auth-group-leaderboard

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// USER (synced from Clerk via webhooks)
// ============================================================================

model User {
  id          String   @id // Clerk userId
  email       String   @unique
  displayName String
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  createdGroups    Group[]                   @relation("CreatedGroups")
  memberships      Membership[]
  createdInvites   GroupInvite[]             @relation("CreatedInvites")
  leaderboardEntries GroupLeaderboardEntry[]
  createdRooms     Room[]                    @relation("CreatedRooms")

  @@index([email])
  @@map("users")
}

// ============================================================================
// GROUP
// ============================================================================

enum GroupPrivacy {
  PRIVATE // Only privacy level for MVP (per spec)
}

model Group {
  id        String        @id @default(cuid())
  name      String
  privacy   GroupPrivacy  @default(PRIVATE)
  createdBy String
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  // Relations
  creator      User                      @relation("CreatedGroups", fields: [createdBy], references: [id], onDelete: Cascade)
  memberships  Membership[]
  invites      GroupInvite[]
  leaderboard  GroupLeaderboardEntry[]
  rooms        Room[]

  @@index([createdBy])
  @@map("groups")
}

// ============================================================================
// MEMBERSHIP
// ============================================================================

enum MembershipRole {
  ADMIN
  MEMBER
}

enum MembershipStatus {
  ACTIVE
  LEFT     // User voluntarily left
  REMOVED  // Admin removed user
}

model Membership {
  id       String           @id @default(cuid())
  userId   String
  groupId  String
  role     MembershipRole   @default(MEMBER)
  status   MembershipStatus @default(ACTIVE)
  joinedAt DateTime         @default(now())
  updatedAt DateTime        @updatedAt

  // Relations
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)

  // Constraints
  @@unique([userId, groupId]) // Prevent duplicate memberships
  @@index([groupId])
  @@index([userId])
  @@index([groupId, role]) // Optimize admin checks
  @@map("memberships")
}

// ============================================================================
// GROUP INVITE
// ============================================================================

enum InviteStatus {
  ACTIVE   // Invite is valid and can be used
  USED     // Invite has been accepted
  REVOKED  // Admin manually revoked
  EXPIRED  // Passed expiresAt timestamp
}

model GroupInvite {
  id        String       @id @default(cuid())
  groupId   String
  token     String       @unique @default(cuid()) // Shareable invite code/token
  createdBy String
  expiresAt DateTime     // Default 7 days from creation
  status    InviteStatus @default(ACTIVE)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  // Relations
  group   Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  creator User  @relation("CreatedInvites", fields: [createdBy], references: [id], onDelete: Cascade)

  @@index([groupId])
  @@index([token])
  @@index([status, expiresAt]) // Optimize active invite queries
  @@map("group_invites")
}

// ============================================================================
// GROUP LEADERBOARD ENTRY
// ============================================================================

model GroupLeaderboardEntry {
  id          String   @id @default(cuid())
  groupId     String
  userId      String
  totalPoints Int      @default(0)
  lastUpdated DateTime @updatedAt

  // Relations
  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Constraints
  @@unique([groupId, userId]) // One entry per user per group
  @@index([groupId, totalPoints(sort: Desc)]) // Optimize leaderboard queries
  @@map("group_leaderboard_entries")
}

// ============================================================================
// ROOM (EXTEND existing model)
// ============================================================================

model Room {
  id        String   @id @default(cuid())
  code      String   @unique
  groupId   String?  // NEW: nullable FK to Group
  createdBy String?  // NEW: nullable FK to User
  // ... existing fields (status, participants, etc.)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  group   Group? @relation(fields: [groupId], references: [id], onDelete: SetNull)
  creator User?  @relation("CreatedRooms", fields: [createdBy], references: [id], onDelete: SetNull)

  @@index([groupId])
  @@index([createdBy])
  @@map("rooms")
}
```

---

## Validation Rules

### User
- **email**: Must be valid email format (enforced by Clerk)
- **displayName**: 1-50 characters, no special characters except spaces, hyphens, underscores
- **avatarUrl**: Must be valid URL or null

### Group
- **name**: 3-50 characters, alphanumeric + spaces allowed
- **privacy**: Must be PRIVATE (only supported value)
- **createdBy**: Must reference existing User

### Membership
- **role**: ADMIN or MEMBER (enum)
- **status**: ACTIVE, LEFT, or REMOVED (enum)
- **Uniqueness**: One membership per (userId, groupId) pair
- **Business Rules**:
  - Group must have at least one ADMIN at all times
  - Admin can leave only if another admin exists OR after promoting another member
  - Max 100 active members per group (soft limit, enforced in application logic)

### GroupInvite
- **token**: Auto-generated CUID, unique across all invites
- **expiresAt**: Must be future timestamp, default 7 days from creation, max 30 days
- **status**: ACTIVE, USED, REVOKED, or EXPIRED (enum)
- **Business Rules**:
  - ACTIVE invites with expiresAt < now() are treated as EXPIRED
  - Each invite can be used exactly once (status → USED on acceptance)
  - Rate limit: 10 invites per hour per admin (enforced in API layer)

### GroupLeaderboardEntry
- **totalPoints**: Non-negative integer, default 0
- **Uniqueness**: One entry per (groupId, userId) pair
- **Update Logic**: 
  - Upsert on game completion: increment totalPoints for participating group members
  - Only users with ACTIVE membership can accrue points
  - Non-members participating in group rooms do NOT get entries

### Room
- **groupId**: Optional FK to Group (null for non-group rooms)
- **createdBy**: Optional FK to User (null for anonymous room creation)
- **Business Rules**:
  - If groupId is set, createdBy must be a member of that group
  - Points from group rooms accrue to GroupLeaderboardEntry for members

---

## State Transitions

### Membership Status
```text
        [User accepts invite]
                │
                ▼
           ┌─────────┐
           │ ACTIVE  │
           └────┬────┘
                │
      ┌─────────┼─────────┐
      │                   │
      │ [User leaves]     │ [Admin removes]
      ▼                   ▼
  ┌──────┐            ┌─────────┐
  │ LEFT │            │ REMOVED │
  └──────┘            └─────────┘
```

### Invite Status
```text
     [Admin creates invite]
                │
                ▼
           ┌─────────┐
           │ ACTIVE  │
           └────┬────┘
                │
      ┌─────────┼─────────┬─────────┐
      │         │         │         │
      │ [Used]  │ [Revoked] │ [Expired]
      ▼         ▼         ▼         
  ┌──────┐  ┌─────────┐ ┌──────────┐
  │ USED │  │ REVOKED │ │ EXPIRED  │
  └──────┘  └─────────┘ └──────────┘
```

---

## Indexing Strategy

### Performance Optimization

| Model | Index | Purpose |
|-------|-------|---------|
| User | `email` | Unique constraint, fast lookup |
| Group | `createdBy` | Find groups created by user |
| Membership | `groupId` | List members of group |
| Membership | `userId` | Find user's memberships |
| Membership | `groupId, role` | Quickly find admins of group |
| GroupInvite | `groupId` | List group's invites |
| GroupInvite | `token` | Fast invite code lookup |
| GroupInvite | `status, expiresAt` | Filter active invites |
| GroupLeaderboardEntry | `groupId, totalPoints DESC` | Sorted leaderboard query |
| Room | `groupId` | Find rooms in group |
| Room | `createdBy` | Find rooms created by user |

---

## Migration Strategy

### Initial Migration
```bash
# Generate initial migration
npx prisma migrate dev --name init_auth_groups_leaderboard

# Apply to production
npx prisma migrate deploy
```

### Extending Existing Room Model
If `Room` model already exists in separate schema:
1. Add `groupId` and `createdBy` columns as nullable
2. Create foreign key constraints with `onDelete: SetNull`
3. Backfill `createdBy` with best-effort user matching (if room history exists)

### Seeding (Optional Dev Data)
```typescript
// apps/backend/src/prisma/seed.ts
async function main() {
  // Create test user
  const user = await prisma.user.create({
    data: {
      id: 'user_test123',
      email: 'test@example.com',
      displayName: 'Test User',
    },
  });

  // Create test group
  const group = await prisma.group.create({
    data: {
      name: 'Test Group',
      createdBy: user.id,
      memberships: {
        create: {
          userId: user.id,
          role: 'ADMIN',
        },
      },
    },
  });
}
```

---

## Query Patterns

### Common Operations

#### 1. Get User's Groups (with role)
```typescript
const groups = await prisma.membership.findMany({
  where: {
    userId: currentUserId,
    status: 'ACTIVE',
  },
  include: {
    group: {
      include: {
        _count: {
          select: { memberships: true },
        },
      },
    },
  },
  orderBy: { joinedAt: 'desc' },
});
```

#### 2. Get Group Leaderboard (paginated)
```typescript
const leaderboard = await prisma.groupLeaderboardEntry.findMany({
  where: { groupId },
  orderBy: { totalPoints: 'desc' },
  take: 50, // Top 50
  include: {
    user: {
      select: { displayName: true, avatarUrl: true },
    },
  },
});
```

#### 3. Check if User is Admin
```typescript
const membership = await prisma.membership.findUnique({
  where: {
    userId_groupId: { userId, groupId },
  },
  select: { role: true, status: true },
});

const isAdmin = membership?.role === 'ADMIN' && membership?.status === 'ACTIVE';
```

#### 4. Accept Invite
```typescript
await prisma.$transaction(async (tx) => {
  // Validate and mark invite as used
  const invite = await tx.groupInvite.update({
    where: { token: inviteCode },
    data: { status: 'USED' },
  });

  // Create membership
  await tx.membership.create({
    data: {
      userId: currentUserId,
      groupId: invite.groupId,
      role: 'MEMBER',
    },
  });
});
```

#### 5. Update Leaderboard on Game Completion
```typescript
for (const result of gameResults) {
  await prisma.groupLeaderboardEntry.upsert({
    where: {
      groupId_userId: { groupId, userId: result.userId },
    },
    update: {
      totalPoints: { increment: result.points },
    },
    create: {
      groupId,
      userId: result.userId,
      totalPoints: result.points,
    },
  });
}
```

---

## Data Integrity & Constraints

### Referential Integrity
- **Cascade Deletes**: 
  - User deleted → cascade to Membership, GroupLeaderboardEntry, GroupInvite
  - Group deleted → cascade to Membership, GroupInvite, GroupLeaderboardEntry
  - Membership deleted → no cascade (leaderboard entries preserved for history)
- **Set Null**: Room.groupId, Room.createdBy set to null if Group/User deleted

### Consistency Checks
- **Admin Requirement**: Before allowing admin to leave, verify another ACTIVE admin exists
- **Invite Expiry**: Cron job or lazy check on usage to mark ACTIVE invites as EXPIRED when expiresAt < now()
- **Leaderboard Cleanup**: Optional: remove entries for users with status != ACTIVE after grace period

### Soft Deletes
- Use `status` enums instead of hard deletes for Membership (preserves audit trail)
- GroupInvite uses explicit REVOKED status rather than deletion

---

## Summary

- **5 New Models**: User, Group, Membership, GroupInvite, GroupLeaderboardEntry
- **1 Extended Model**: Room (add groupId, createdBy)
- **Schema Location**: `apps/backend/src/prisma/schema.prisma`
- **Indexes**: 11 indexes for query optimization
- **Constraints**: 2 unique constraints, 6 foreign keys, 4 enums
- **Migration**: Single initial migration + optional seed data

**Phase 1 (Data Model) Complete**: Schema ready for contract definition and implementation.
