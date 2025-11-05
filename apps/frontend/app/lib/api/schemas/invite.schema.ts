// Invite-related API schemas and types

export interface GroupInvite {
  id: string
  groupId: string
  token: string
  code: string
  createdBy: string
  expiresAt: string
  status: 'ACTIVE' | 'USED' | 'REVOKED' | 'EXPIRED'
  createdAt: string
  updatedAt: string
  group?: {
    id: string
    name: string
  }
  creator?: {
    id: string
    displayName: string
  }
}

export interface InviteStatus {
  ACTIVE: 'ACTIVE'
  USED: 'USED'
  REVOKED: 'REVOKED'
  EXPIRED: 'EXPIRED'
}

// API Request/Response types
export interface GenerateInviteRequest {
  expiresInDays: number
}

export interface GenerateInviteResponse {
  invite: GroupInvite
  inviteLink: string
  inviteCode: string
}

export interface InviteListResponse {
  invites: GroupInvite[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface AcceptInviteResponse {
  success: boolean
  message: string
  membership: {
    id: string
    groupId: string
    role: 'MEMBER'
    joinedAt: string
  }
  group: {
    id: string
    name: string
  }
}

export interface RevokeInviteResponse {
  success: boolean
  message: string
}