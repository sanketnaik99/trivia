// Membership-related API schemas and types

export interface MembershipRole {
  ADMIN: 'ADMIN'
  MEMBER: 'MEMBER'
}

export interface MembershipStatus {
  ACTIVE: 'ACTIVE'
  LEFT: 'LEFT'
  REMOVED: 'REMOVED'
}

// API Request/Response types
export interface RemoveMemberResponse {
  success: boolean
  message: string
}

export interface PromoteMemberResponse {
  success: boolean
  message: string
  membership: {
    id: string
    role: 'ADMIN' | 'MEMBER'
    updatedAt: string
  }
}

export interface LeaveGroupResponse {
  success: boolean
  message: string
}