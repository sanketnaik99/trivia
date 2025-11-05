// Query key factory for consistent cache keys
export const queryKeys = {
  // Groups
  groups: ['groups'] as const,
  groupDetail: (groupId: string) => ['groups', groupId] as const,

  // Memberships
  memberships: (groupId: string) => ['groups', groupId, 'memberships'] as const,

  // Invites
  invites: (groupId: string) => ['groups', groupId, 'invites'] as const,

  // Leaderboards (for future use)
  leaderboard: (groupId: string) => ['groups', groupId, 'leaderboard'] as const,
}