// Group-related API schemas and types

export interface User {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Group {
  id: string
  name: string
  privacy: 'PRIVATE'
  createdBy: string
  createdAt: string
  updatedAt: string
  creator?: User
  memberCount?: number
}

export interface Membership {
  id: string
  userId: string
  groupId: string
  role: 'ADMIN' | 'MEMBER'
  status: 'ACTIVE' | 'LEFT' | 'REMOVED'
  joinedAt: string
  updatedAt: string
  user?: User
  group?: Group
}

export interface GroupWithRole extends Group {
  role: 'ADMIN' | 'MEMBER'
  joinedAt: string
}

export interface GroupDetail extends Group {
  userRole: 'ADMIN' | 'MEMBER'
  members: Array<{
    id: string
    userId: string
    groupId: string
    role: 'ADMIN' | 'MEMBER'
    status: 'ACTIVE' | 'LEFT' | 'REMOVED'
    joinedAt: string
    updatedAt: string
    user: {
      id: string
      displayName: string
      avatarUrl?: string
    }
  }>
}

// Backend response structure (what the API actually returns)
export interface GroupDetailBackendResponse {
  group: {
    id: string
    name: string
    privacy: 'PRIVATE'
    createdBy: string
    createdAt: string
    memberCount: number
  }
  membership: {
    userId: string
    groupId: string
    role: 'ADMIN' | 'MEMBER'
    joinedAt: string
    status: 'ACTIVE' | 'LEFT' | 'REMOVED'
  }
  members: Array<{
    id: string
    userId: string
    groupId: string
    role: 'ADMIN' | 'MEMBER'
    status: 'ACTIVE' | 'LEFT' | 'REMOVED'
    joinedAt: string
    updatedAt: string
    user: {
      id: string
      displayName: string
      avatarUrl?: string
    }
  }>
}

// API Request/Response types
export interface CreateGroupRequest {
  name: string
}

export interface UpdateGroupRequest {
  name: string
}

export interface GroupListResponse {
  groups: GroupWithRole[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateGroupResponse {
  group: Group
  membership: Membership
}

export type GroupDetailResponse = GroupDetail

export interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string
  avatarUrl?: string
  totalPoints: number
  gamesPlayed?: number
  lastUpdated: string
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  groupInfo: {
    id: string
    name: string
    totalGamesPlayed: number
  }
}

export interface GroupActivity {
  id: string
  type: 'leaderboard_update' | 'room_created'
  timestamp: string
  user: {
    displayName: string
    avatarUrl?: string
  }
  data: {
    points?: number
    roomCode?: string
  }
}

export interface GroupActivityResponse {
  activities: GroupActivity[]
}