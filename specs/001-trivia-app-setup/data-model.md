# Data Model: Quizable

Created: 2025-10-30

## Entities

### User (external via Clerk)
- userId: string (Clerk ID)
- displayName: string
- imageUrl: string

### Room
- id: string (UUID)
- hostUserId: string (Clerk userId)
- status: 'waiting' | 'active' | 'completed'
- createdAt: ISO datetime
- startedAt?: ISO datetime
- endedAt?: ISO datetime
- participants: Participant[] (max 16)

Constraints:
- Max 16 participants
- Only host can start/stop session

### Participant
- userId: string (Clerk userId)
- joinedAt: ISO datetime
- leftAt?: ISO datetime

### Group
- id: string (UUID)
- name: string (unique per owner)
- ownerUserId: string (Clerk userId)
- members: GroupMember[]
- createdAt: ISO datetime

### GroupMember
- userId: string (Clerk userId)
- joinedAt: ISO datetime

### LeaderboardEntry
- groupId: string (UUID)
- userId: string (Clerk userId)
- totalPoints: number
- sessionsPlayed: number
- rank: number (derived)

Constraints:
- Ranking by totalPoints desc; tie-breaker: sessionsPlayed desc, then earliest join date

### Session
- id: string (UUID)
- roomId: string (UUID)
- groupId?: string (UUID)
- startedAt: ISO datetime
- endedAt: ISO datetime
- scores: Score[]

### Score
- userId: string (Clerk userId)
- points: number

## Relationships
- User 1..* participates in Rooms via Participant
- Group 1..* has GroupMembers; Group 1..* Sessions contribute to LeaderboardEntry per user
- Session belongs to a Room; optionally linked to a Group

## Validation Rules
- Room.join: reject if participants.length >= 16
- Room.join: reject if room.status in ['active','completed'] and policy forbids joining (see spec edge cases)
- Group.name: must be non-empty; unique per ownerUserId
- LeaderboardEntry: totalPoints >= 0; sessionsPlayed >= 0

## Notes
- Clerk user data is referenced by userId; no local user table required
- Persistence: Supabase (Postgres) with unique indexes; future RLS policies to scope data per user/group
