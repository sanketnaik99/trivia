# Feature Specification: Authentication, Groups, and Persistent Leaderboards

**Feature Branch**: `003-auth-group-leaderboard`  
**Created**: 2025-11-02  
**Status**: Draft  
**Input**: User description: "Add authentication to this app and allow users to create 'groups' where they can have persistent leaderboards. A group admin can create a group and invite others to the group. When a group creates a trivia room, any points that are earned are added to the group leaderboard which shows the players in the groups and the points that they have."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign up / Sign in (Priority: P1)

As a player, I can create an account and sign in so my identity and points persist across sessions and can be attributed to groups.

Why this priority: Authentication is a prerequisite for persistent identity and group membership. Without it, groups and long-lived leaderboards are not meaningful.

Independent Test: Can a new user create an account, sign in, see their display name, and sign out/in again with identity preserved?

Acceptance Scenarios:

1. Given a new visitor, When they register with required details, Then an account is created and they are signed in.
2. Given a signed-in user, When they sign out and sign back in, Then their profile and history remain intact.
3. Given a signed-in user, When they attempt an action requiring authentication, Then it succeeds; When a signed-out user attempts it, Then they are prompted to sign in.

Independent Test: Can an authenticated user create a group, obtain an invite, and another authenticated user use that invite to join and appear in the member list?

Acceptance Scenarios:

1. Given an authenticated user, When they create a group with a name, Then they become the group admin and the group appears in their groups list.
2. Given a group admin, When they generate and share an invite, Then invitees can accept it and appear as members.
3. Given a member, When they leave the group, Then their membership is revoked and they no longer appear in the member list.

Independent Test: Can a member start a group room, complete a game, and see member totals updated on the group leaderboard immediately after?

Acceptance Scenarios:

1. Given a group member, When they create a trivia room with the group selected, Then the room is marked as group-affiliated.
2. Given a completed game in a group-affiliated room, When group members earn points, Then those points are added to each member's cumulative group total and visible on the group leaderboard.
3. Given non-members participating in a group room, When the game completes, Then their points do not affect the group leaderboard and remain only in the room's local results.

Independent Test: Can a member open the group page and see accurate totals that reflect recent games, with basic sorting and pagination for larger groups?

Acceptance Scenarios:

1. Given a group with members, When a member views the leaderboard, Then members are listed with display name and total points.
2. Given recent games, When the leaderboard is refreshed, Then totals reflect all completed games associated with the group.

### Edge Cases

- User participates in a group room while signed out: prompt to sign in; if they continue as guest, their points only affect the room-local results, not group persistence.
- A user belongs to multiple groups: When creating a room, they must explicitly choose one group; points accrue to that selected group only.
- Admin leaves the group: multiple admins are allowed; an admin may leave only if at least one other admin remains, or after delegating admin rights to another member.
- Invite link/code expires or is revoked: joining fails with a clear message; admin can regenerate a new invite.
- Display name changes: leaderboard shows latest display name while keeping the same underlying identity to avoid duplicate entries.

## Requirements *(mandatory)*

### Functional Requirements

- FR-001: The system MUST allow users to register, sign in, and sign out, and persist their identity across sessions.
- FR-002: The system MUST allow authenticated users to create a private group and become its admin.
- FR-003: The system MUST allow group admins to invite users to the group via a shareable invitation (link or code) and allow invitees to accept and join.
- FR-004: The system MUST allow group admins to remove members and allow members to leave the group.
- FR-005: The system MUST allow authenticated group members to create trivia rooms on behalf of a selected group.
- FR-006: The system MUST attribute points earned by participating group members in a group-affiliated room to their cumulative totals on that group's leaderboard.
- FR-007: The system MUST ensure that non-members' points in a group room do not affect the group leaderboard; their points remain visible in the room's local results only.
- FR-008: The system MUST provide a group leaderboard view listing members and their cumulative points, sortable by total points.
- FR-009: The system MUST update group leaderboard totals promptly after a game completes (near real-time or on completion refresh).
- FR-010: The system MUST handle invitation lifecycle: create, share, expire/revoke, and prevent reuse after acceptance or expiration.
- FR-011: The system MUST restrict group management actions (e.g., invite, remove, generate invites) to admins only.
- FR-012: The system MUST provide clear error and empty states (no groups, no members, no games yet) with guidance on next steps.
- FR-013: The system SHOULD provide basic privacy defaults: groups are private and not discoverable without an invite.
- FR-014: The system SHOULD allow a user to belong to multiple groups; when starting a room, the user MUST choose one group.
- FR-015: The system MUST prevent double-counting the same game's points on the group leaderboard.
- FR-016: The system MUST retain leaderboard data across sessions and app restarts.
 - FR-017: The system MUST support invitations in both link and code formats, honoring expiration and revocation.

### Key Entities *(include if feature involves data)*

- User: unique identity, display name, optional avatar, createdAt, status.
- Group: id, name, createdAt, createdBy (admin), privacy (private), settings.
- Membership: userId, groupId, role (admin, member), joinedAt, status.
- GroupInvite: id/token, groupId, createdBy, expiresAt, status (active, revoked, used).
- Room: existing concept extended with optional groupId and createdBy.
- GroupLeaderboardEntry: groupId, userId, totalPoints, lastUpdated; derived from completed games associated with the group.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- SC-001: 95% of new users can register, sign in, and reach the "Create Group" action in under 2 minutes.
- SC-002: 95% of invite acceptances complete successfully within 60 seconds from opening the invite.
- SC-003: After a group game ends, group leaderboard totals reflect results within 5 seconds of completion for 95% of games.
- SC-004: Users report that finding their position on the group leaderboard is easy, achieving a 90% success rate in usability checks.
- SC-005: Persistent data is retained across sessions for 100% of verified test accounts over a 7-day period (no unintended resets).

### Assumptions

- Default authentication flow is email/password with email-based verification; social sign-in may be added later.
- Groups are private by default and joinable only via invite.
- A room belongs to at most one group; points from that room accrue only to that group.
- Only authenticated users can be members; guests can play but do not accrue persistent points.

### Out of Scope

- Public/discoverable groups or search/browse of groups.
- Advanced moderation (e.g., reports, bans beyond admin removal).
- Cross-group tournaments or leaderboards.
- Detailed analytics dashboards beyond basic leaderboard views.

### Decisions

- Non-member points in group rooms are excluded from group leaderboard totals; there is no retroactive attribution if they join later.
- Multiple admins are allowed; an admin may leave only if at least one other admin remains or after delegating admin rights to another member.
- Invitations are provided via both link and code formats; both respect expiration and revocation.

## Clarifications

### Session 2025-11-02

- Q: Should we migrate frontend API calls to @tanstack/react-query before implementing User Stories 3 & 4? → A: Yes, this is a high-priority blocking task. All existing API calls (groups, memberships, invites) must be migrated to React Query to establish proper data fetching patterns before adding more API-dependent features. This provides better caching, automatic refetching, loading states, and reduces boilerplate. Additionally, we will use axios instead of native fetch for better request/response interceptors and error handling. All API responses will be fully typed with TypeScript interfaces to ensure type safety throughout the application.

**Impact on Implementation**:
- Added new Phase 4.5 (React Query Migration) as a blocking prerequisite for User Stories 3 & 4
- This is purely an infrastructure refactoring with zero functional changes
- All existing features (auth, groups, invites) must continue to work identically
- Establishes consistent patterns for data fetching, mutations, caching, and optimistic updates
- Axios will replace native fetch for cleaner interceptor-based authentication and error handling
- Complete TypeScript typing for all API requests/responses with dedicated schema files (group.schema.ts, membership.schema.ts, invite.schema.ts)
- Eliminates any 'any' types in the API layer, providing full IntelliSense support and compile-time safety
- Timeline extended by ~1 week to accommodate migration work
- 51 new tasks added to tasks.md covering setup, typed schemas, query hooks, component migrations, and testing

### Measurable Outcomes
