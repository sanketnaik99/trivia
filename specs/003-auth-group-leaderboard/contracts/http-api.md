# HTTP API Contracts

**Feature**: Authentication, Groups, and Persistent Leaderboards  
**Generated**: 2025-11-02  
**Base URL**: `http://localhost:3001` (dev) / `https://api.trivia.example.com` (prod)

## Overview

This document defines the REST API endpoints required for authentication integration, group management, invitations, and persistent leaderboards. All endpoints require JSON content type unless otherwise specified.

## Authentication

All protected endpoints require a valid Clerk session token passed via the `Authorization` header:

```
Authorization: Bearer <clerk_session_token>
```

Endpoints return `401 Unauthorized` if the token is missing or invalid.

## Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional context
  }
}
```

Common error codes:
- `UNAUTHORIZED` (401): Missing or invalid authentication token
- `FORBIDDEN` (403): Authenticated but lacks permission for action
- `NOT_FOUND` (404): Requested resource does not exist
- `VALIDATION_ERROR` (400): Request payload validation failed
- `CONFLICT` (409): Operation conflicts with current state
- `INTERNAL_ERROR` (500): Server-side error

---

## User Endpoints

### Sync User from Clerk (Webhook)

**Purpose**: Clerk webhook handler to sync user data to Prisma database (FR-001)

**Endpoint**: `POST /api/webhooks/clerk`

**Authentication**: Webhook signature validation (Clerk Svix signature)

**Request Headers**:
```
svix-id: <message_id>
svix-timestamp: <timestamp>
svix-signature: <signature>
```

**Request Body** (example for `user.created` event):
```json
{
  "type": "user.created",
  "data": {
    "id": "user_2abc123",
    "email_addresses": [
      {
        "email_address": "alice@example.com",
        "id": "email_2xyz"
      }
    ],
    "first_name": "Alice",
    "last_name": "Smith",
    "image_url": "https://img.clerk.com/...",
    "created_at": 1698765432000
  }
}
```

**Success Response** (200):
```json
{
  "received": true
}
```

**Error Responses**:
- `400 VALIDATION_ERROR`: Invalid webhook signature
- `500 INTERNAL_ERROR`: Database sync failed

**Related Requirements**: FR-001 (user identity persistence)

---

## Group Endpoints

### Create Group

**Purpose**: Allow authenticated users to create a new private group and become its admin (FR-002)

**Endpoint**: `POST /api/groups`

**Authentication**: Required (Clerk session token)

**Request Body**:
```json
{
  "name": "Team Trivia Champions"
}
```

**Validation**:
- `name`: Required, 3-50 characters, no leading/trailing whitespace

**Success Response** (201):
```json
{
  "group": {
    "id": "grp_abc123",
    "name": "Team Trivia Champions",
    "privacy": "PRIVATE",
    "createdBy": "user_2abc123",
    "createdAt": "2025-11-02T10:00:00.000Z",
    "memberCount": 1
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: User not authenticated
- `400 VALIDATION_ERROR`: Invalid group name
- `500 INTERNAL_ERROR`: Database error

**Related Requirements**: FR-002 (create group), FR-013 (private by default)

---

### List User's Groups

**Purpose**: Retrieve all groups the authenticated user is a member of (FR-014)

**Endpoint**: `GET /api/groups`

**Authentication**: Required

**Query Parameters**:
- `page` (optional): Page number, default 1
- `limit` (optional): Results per page, default 20, max 100

**Success Response** (200):
```json
{
  "groups": [
    {
      "id": "grp_abc123",
      "name": "Team Trivia Champions",
      "privacy": "PRIVATE",
      "role": "ADMIN",
      "memberCount": 5,
      "joinedAt": "2025-11-02T10:00:00.000Z"
    },
    {
      "id": "grp_def456",
      "name": "Office Quiz Squad",
      "privacy": "PRIVATE",
      "role": "MEMBER",
      "memberCount": 12,
      "joinedAt": "2025-11-03T14:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: User not authenticated
- `500 INTERNAL_ERROR`: Database error

**Related Requirements**: FR-014 (multiple groups per user)

---

### Get Group Detail

**Purpose**: Retrieve detailed information about a specific group (FR-008)

**Endpoint**: `GET /api/groups/:groupId`

**Authentication**: Required (must be a member of the group)

**Path Parameters**:
- `groupId`: Group identifier

**Success Response** (200):
```json
{
  "group": {
    "id": "grp_abc123",
    "name": "Team Trivia Champions",
    "privacy": "PRIVATE",
    "createdBy": "user_2abc123",
    "createdAt": "2025-11-02T10:00:00.000Z",
    "memberCount": 5,
    "userRole": "ADMIN"
  },
  "members": [
    {
      "userId": "user_2abc123",
      "displayName": "Alice Smith",
      "avatarUrl": "https://img.clerk.com/...",
      "role": "ADMIN",
      "joinedAt": "2025-11-02T10:00:00.000Z"
    },
    {
      "userId": "user_3def456",
      "displayName": "Bob Jones",
      "avatarUrl": null,
      "role": "MEMBER",
      "joinedAt": "2025-11-02T11:15:00.000Z"
    }
  ]
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: User not authenticated
- `403 FORBIDDEN`: User is not a member of this group
- `404 NOT_FOUND`: Group does not exist
- `500 INTERNAL_ERROR`: Database error

**Related Requirements**: FR-008 (view group members), FR-011 (role visibility)

---

### Update Group

**Purpose**: Allow admins to update group settings (FR-011)

**Endpoint**: `PATCH /api/groups/:groupId`

**Authentication**: Required (must be an admin of the group)

**Path Parameters**:
- `groupId`: Group identifier

**Request Body**:
```json
{
  "name": "Updated Team Name"
}
```

**Validation**:
- `name`: Optional, 3-50 characters if provided

**Success Response** (200):
```json
{
  "group": {
    "id": "grp_abc123",
    "name": "Updated Team Name",
    "privacy": "PRIVATE",
    "createdBy": "user_2abc123",
    "createdAt": "2025-11-02T10:00:00.000Z",
    "updatedAt": "2025-11-03T09:00:00.000Z",
    "memberCount": 5
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: User not authenticated
- `403 FORBIDDEN`: User is not an admin of this group
- `404 NOT_FOUND`: Group does not exist
- `400 VALIDATION_ERROR`: Invalid name
- `500 INTERNAL_ERROR`: Database error

**Related Requirements**: FR-011 (admin-only actions)

---

## Invitation Endpoints

### Generate Invite

**Purpose**: Allow group admins to create shareable invitations (link and code) (FR-003, FR-010, FR-017)

**Endpoint**: `POST /api/groups/:groupId/invites`

**Authentication**: Required (must be an admin of the group)

**Path Parameters**:
- `groupId`: Group identifier

**Request Body**:
```json
{
  "expiresInDays": 7
}
```

**Validation**:
- `expiresInDays`: Optional, default 7, min 1, max 30

**Success Response** (201):
```json
{
  "invite": {
    "id": "inv_xyz789",
    "token": "grp_abc123_1a2b3c4d5e6f",
    "groupId": "grp_abc123",
    "createdBy": "user_2abc123",
    "createdAt": "2025-11-02T10:00:00.000Z",
    "expiresAt": "2025-11-09T10:00:00.000Z",
    "status": "ACTIVE"
  },
  "inviteLink": "https://trivia.example.com/invite/grp_abc123_1a2b3c4d5e6f",
  "inviteCode": "1A2B3C"
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: User not authenticated
- `403 FORBIDDEN`: User is not an admin of this group
- `404 NOT_FOUND`: Group does not exist
- `429 TOO_MANY_REQUESTS`: Rate limit exceeded (10 invites/hour/admin)
- `500 INTERNAL_ERROR`: Database error

**Related Requirements**: FR-003 (invite generation), FR-010 (invite lifecycle), FR-011 (admin-only), FR-017 (link and code formats)

---

### List Group Invites

**Purpose**: Allow admins to view active invites (FR-010)

**Endpoint**: `GET /api/groups/:groupId/invites`

**Authentication**: Required (must be an admin of the group)

**Path Parameters**:
- `groupId`: Group identifier

**Query Parameters**:
- `status` (optional): Filter by status (ACTIVE, USED, REVOKED, EXPIRED)

**Success Response** (200):
```json
{
  "invites": [
    {
      "id": "inv_xyz789",
      "token": "grp_abc123_1a2b3c4d5e6f",
      "createdBy": "user_2abc123",
      "createdAt": "2025-11-02T10:00:00.000Z",
      "expiresAt": "2025-11-09T10:00:00.000Z",
      "status": "ACTIVE",
      "usedBy": null,
      "usedAt": null
    },
    {
      "id": "inv_abc123",
      "token": "grp_abc123_9z8y7x6w5v4u",
      "createdBy": "user_2abc123",
      "createdAt": "2025-11-01T08:00:00.000Z",
      "expiresAt": "2025-11-08T08:00:00.000Z",
      "status": "USED",
      "usedBy": "user_3def456",
      "usedAt": "2025-11-02T11:15:00.000Z"
    }
  ]
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: User not authenticated
- `403 FORBIDDEN`: User is not an admin of this group
- `404 NOT_FOUND`: Group does not exist
- `500 INTERNAL_ERROR`: Database error

**Related Requirements**: FR-010 (invite lifecycle management)

---

### Revoke Invite

**Purpose**: Allow admins to revoke an active invite (FR-010)

**Endpoint**: `POST /api/invites/:inviteId/revoke`

**Authentication**: Required (must be an admin of the group)

**Path Parameters**:
- `inviteId`: Invite identifier

**Success Response** (200):
```json
{
  "invite": {
    "id": "inv_xyz789",
    "token": "grp_abc123_1a2b3c4d5e6f",
    "status": "REVOKED",
    "revokedAt": "2025-11-03T10:00:00.000Z"
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: User not authenticated
- `403 FORBIDDEN`: User is not an admin of the invite's group
- `404 NOT_FOUND`: Invite does not exist
- `409 CONFLICT`: Invite already used, revoked, or expired
- `500 INTERNAL_ERROR`: Database error

**Related Requirements**: FR-010 (invite lifecycle), FR-011 (admin-only)

---

### Accept Invite (by Token)

**Purpose**: Allow authenticated users to join a group via invite link (FR-003, FR-017)

**Endpoint**: `POST /api/invites/:token/accept`

**Authentication**: Required

**Path Parameters**:
- `token`: Invite token (from invite link)

**Success Response** (200):
```json
{
  "membership": {
    "userId": "user_3def456",
    "groupId": "grp_abc123",
    "role": "MEMBER",
    "status": "ACTIVE",
    "joinedAt": "2025-11-02T11:15:00.000Z"
  },
  "group": {
    "id": "grp_abc123",
    "name": "Team Trivia Champions"
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: User not authenticated
- `404 NOT_FOUND`: Invite does not exist
- `409 CONFLICT`: Invite expired, revoked, or already used
- `409 CONFLICT`: User is already a member of this group
- `500 INTERNAL_ERROR`: Database error

**Related Requirements**: FR-003 (accept invite), FR-010 (prevent reuse after acceptance), FR-017 (link format)

---

### Accept Invite (by Code)

**Purpose**: Allow authenticated users to join a group via 6-character invite code (FR-003, FR-017)

**Endpoint**: `POST /api/invites/accept-code`

**Authentication**: Required

**Request Body**:
```json
{
  "code": "1A2B3C"
}
```

**Validation**:
- `code`: Required, 6 characters, alphanumeric

**Success Response** (200):
```json
{
  "membership": {
    "userId": "user_3def456",
    "groupId": "grp_abc123",
    "role": "MEMBER",
    "status": "ACTIVE",
    "joinedAt": "2025-11-02T11:15:00.000Z"
  },
  "group": {
    "id": "grp_abc123",
    "name": "Team Trivia Champions"
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: User not authenticated
- `404 NOT_FOUND`: Invalid invite code
- `409 CONFLICT`: Invite expired, revoked, or already used
- `409 CONFLICT`: User is already a member of this group
- `500 INTERNAL_ERROR`: Database error

**Related Requirements**: FR-003 (accept invite), FR-010 (prevent reuse), FR-017 (code format)

---

## Membership Endpoints

### Leave Group

**Purpose**: Allow members to leave a group (FR-004)

**Endpoint**: `POST /api/groups/:groupId/leave`

**Authentication**: Required (must be a member of the group)

**Path Parameters**:
- `groupId`: Group identifier

**Success Response** (200):
```json
{
  "message": "Successfully left group",
  "membership": {
    "userId": "user_3def456",
    "groupId": "grp_abc123",
    "status": "LEFT",
    "leftAt": "2025-11-03T10:00:00.000Z"
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: User not authenticated
- `403 FORBIDDEN`: User is not a member of this group
- `409 CONFLICT`: Last admin cannot leave (must promote another member first)
- `404 NOT_FOUND`: Group does not exist
- `500 INTERNAL_ERROR`: Database error

**Related Requirements**: FR-004 (leave group), Edge case (admin delegation)

---

### Remove Member

**Purpose**: Allow admins to remove members from the group (FR-004, FR-011)

**Endpoint**: `POST /api/groups/:groupId/members/:userId/remove`

**Authentication**: Required (must be an admin of the group)

**Path Parameters**:
- `groupId`: Group identifier
- `userId`: User identifier to remove

**Success Response** (200):
```json
{
  "message": "Member removed successfully",
  "membership": {
    "userId": "user_4ghi789",
    "groupId": "grp_abc123",
    "status": "REMOVED",
    "removedAt": "2025-11-03T10:00:00.000Z",
    "removedBy": "user_2abc123"
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: User not authenticated
- `403 FORBIDDEN`: User is not an admin of this group
- `403 FORBIDDEN`: Cannot remove another admin
- `404 NOT_FOUND`: Group or user does not exist
- `409 CONFLICT`: User is not a member of this group
- `500 INTERNAL_ERROR`: Database error

**Related Requirements**: FR-004 (remove member), FR-011 (admin-only), Edge case (admin protection)

---

### Promote to Admin

**Purpose**: Allow admins to promote members to admin role (FR-011, Edge case)

**Endpoint**: `POST /api/groups/:groupId/members/:userId/promote`

**Authentication**: Required (must be an admin of the group)

**Path Parameters**:
- `groupId`: Group identifier
- `userId`: User identifier to promote

**Success Response** (200):
```json
{
  "membership": {
    "userId": "user_3def456",
    "groupId": "grp_abc123",
    "role": "ADMIN",
    "promotedAt": "2025-11-03T10:00:00.000Z"
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: User not authenticated
- `403 FORBIDDEN`: User is not an admin of this group
- `404 NOT_FOUND`: Group or user does not exist
- `409 CONFLICT`: User is not a member or already an admin
- `500 INTERNAL_ERROR`: Database error

**Related Requirements**: FR-011 (role management), Edge case (multiple admins)

---

## Room Endpoints

### Create Room (Extended)

**Purpose**: Allow members to create trivia rooms affiliated with a group (FR-005, FR-014)

**Endpoint**: `POST /api/rooms`

**Authentication**: Optional (required for group-affiliated rooms)

**Request Body**:
```json
{
  "hostName": "Alice Smith",
  "groupId": "grp_abc123",
  "maxPlayers": 10,
  "roundCount": 5
}
```

**Validation**:
- `hostName`: Required if not authenticated, 3-50 characters
- `groupId`: Optional, must be a valid group ID where user is a member
- `maxPlayers`: Optional, default 10, min 2, max 50
- `roundCount`: Optional, default 5, min 1, max 20

**Success Response** (201):
```json
{
  "room": {
    "code": "ABCD12",
    "hostName": "Alice Smith",
    "groupId": "grp_abc123",
    "createdBy": "user_2abc123",
    "maxPlayers": 10,
    "roundCount": 5,
    "status": "WAITING",
    "createdAt": "2025-11-02T10:00:00.000Z"
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: User not authenticated but groupId provided
- `403 FORBIDDEN`: User is not a member of the specified group
- `404 NOT_FOUND`: Group does not exist
- `400 VALIDATION_ERROR`: Invalid request payload
- `500 INTERNAL_ERROR`: Database error

**Related Requirements**: FR-005 (create group room), FR-014 (choose group)

---

## Leaderboard Endpoints

### Get Group Leaderboard

**Purpose**: Retrieve paginated leaderboard for a group (FR-008, FR-009)

**Endpoint**: `GET /api/groups/:groupId/leaderboard`

**Authentication**: Required (must be a member of the group)

**Path Parameters**:
- `groupId`: Group identifier

**Query Parameters**:
- `page` (optional): Page number, default 1
- `limit` (optional): Results per page, default 50, max 100
- `sortBy` (optional): Sort field, default "totalPoints"
- `order` (optional): Sort order (asc, desc), default "desc"

**Success Response** (200):
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "user_2abc123",
      "displayName": "Alice Smith",
      "avatarUrl": "https://img.clerk.com/...",
      "totalPoints": 450,
      "gamesPlayed": 12,
      "lastUpdated": "2025-11-03T09:30:00.000Z"
    },
    {
      "rank": 2,
      "userId": "user_3def456",
      "displayName": "Bob Jones",
      "avatarUrl": null,
      "totalPoints": 380,
      "gamesPlayed": 10,
      "lastUpdated": "2025-11-03T08:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5,
    "totalPages": 1
  },
  "groupInfo": {
    "id": "grp_abc123",
    "name": "Team Trivia Champions",
    "totalGamesPlayed": 15
  }
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: User not authenticated
- `403 FORBIDDEN`: User is not a member of this group
- `404 NOT_FOUND`: Group does not exist
- `500 INTERNAL_ERROR`: Database error

**Related Requirements**: FR-008 (leaderboard view), FR-009 (near real-time updates), FR-016 (persistent data)

---

### Update Leaderboard (Internal)

**Purpose**: Backend service endpoint to update leaderboard after game completion (FR-006, FR-009, FR-015)

**Endpoint**: `POST /api/internal/leaderboard/update`

**Authentication**: Internal service authentication (API key or service token)

**Request Body**:
```json
{
  "groupId": "grp_abc123",
  "roomCode": "ABCD12",
  "results": [
    {
      "userId": "user_2abc123",
      "displayName": "Alice Smith",
      "points": 85
    },
    {
      "userId": "user_3def456",
      "displayName": "Bob Jones",
      "points": 70
    },
    {
      "userId": null,
      "displayName": "Guest123",
      "points": 60
    }
  ]
}
```

**Validation**:
- `groupId`: Required, valid group ID
- `roomCode`: Required, valid room code
- `results`: Required, array of player results
- `results[].userId`: Optional (null for guests), must be group member if provided
- `results[].points`: Required, non-negative integer

**Success Response** (200):
```json
{
  "updated": [
    {
      "userId": "user_2abc123",
      "newTotal": 450,
      "pointsAdded": 85
    },
    {
      "userId": "user_3def456",
      "newTotal": 380,
      "pointsAdded": 70
    }
  ],
  "skipped": [
    {
      "displayName": "Guest123",
      "reason": "Not a group member"
    }
  ]
}
```

**Error Responses**:
- `401 UNAUTHORIZED`: Missing or invalid service token
- `404 NOT_FOUND`: Group or room does not exist
- `409 CONFLICT`: Game results already processed (prevent double-counting)
- `500 INTERNAL_ERROR`: Database error

**Related Requirements**: FR-006 (attribute points to members), FR-007 (exclude non-members), FR-009 (prompt updates), FR-015 (prevent double-counting)

---

## Rate Limits

- **Invite Generation**: 10 invites per hour per admin (per group)
- **Create Group**: 5 groups per hour per user
- **Create Room**: 10 rooms per hour per user

Rate limit responses return `429 TOO_MANY_REQUESTS` with:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "retryAfter": 3600,
      "limit": 10,
      "window": "1 hour"
    }
  }
}
```

---

## Notes

1. **Clerk Integration**: User authentication is handled by Clerk. The `/api/webhooks/clerk` endpoint syncs user data to the Prisma database via webhooks.

2. **Invite Formats**: Invites support both link format (`https://trivia.example.com/invite/{token}`) and 6-character code format (e.g., `1A2B3C`). Both formats map to the same `GroupInvite` record.

3. **Guest Handling**: Guests can participate in group-affiliated rooms but their points do not affect the group leaderboard (FR-007).

4. **Multiple Groups**: Users can belong to multiple groups (FR-014). When creating a room, they must explicitly select one group via the `groupId` parameter.

5. **Admin Rules**: Admins cannot be removed by other admins. The last admin in a group cannot leave without promoting another member first.

6. **Leaderboard Updates**: The `/api/internal/leaderboard/update` endpoint is called by the backend game service after a game completes. It handles point attribution and prevents double-counting (FR-015).

7. **Data Persistence**: All leaderboard data is stored in the PostgreSQL database and persists across sessions (FR-016).

8. **Empty States**: Endpoints return empty arrays with appropriate pagination metadata when no results exist (FR-012).
