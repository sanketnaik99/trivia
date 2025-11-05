import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '../client'
import { queryKeys } from '../query-keys'
import type {
  GroupListResponse,
  GroupDetailResponse,
  GroupDetailBackendResponse,
  CreateGroupRequest,
  CreateGroupResponse,
  UpdateGroupRequest,
  Group,
  LeaderboardResponse,
  GroupActivityResponse,
  GroupActiveRoomsResponse
} from '../schemas/group.schema'
import { useRouter } from 'next/navigation'

// Query: Get user's groups
export function useGroups() {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: async (): Promise<GroupListResponse> => {
      const token = await getToken()
      const response = await apiClient.get('/groups', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data.data
    },
    enabled: !!getToken, // Only run when user is authenticated
  })
}

// Query: Get group detail
export function useGroupDetail(groupId: string) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: queryKeys.groupDetail(groupId),
    queryFn: async (): Promise<GroupDetailResponse> => {
      const token = await getToken()
      const response = await apiClient.get(`/groups/${groupId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const backendData: GroupDetailBackendResponse = response.data.data
      
      // Transform backend response to match frontend schema
      return {
        id: backendData.group.id,
        name: backendData.group.name,
        privacy: backendData.group.privacy,
        createdBy: backendData.group.createdBy,
        createdAt: backendData.group.createdAt,
        updatedAt: backendData.group.createdAt, // Backend doesn't return updatedAt on group
        memberCount: backendData.group.memberCount,
        userRole: backendData.membership.role,
        members: backendData.members,
      }
    },
    enabled: !!groupId && !!getToken,
  })
}

// Mutation: Create group
export function useCreateGroup() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateGroupRequest): Promise<CreateGroupResponse> => {
      const token = await getToken()
      const response = await apiClient.post('/groups', data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data.data
    },
    onSuccess: () => {
      // Invalidate groups list to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.groups })
    },
  })
}

// Mutation: Update group
export function useUpdateGroup() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      groupId,
      data
    }: {
      groupId: string
      data: UpdateGroupRequest
    }): Promise<Group> => {
      const token = await getToken()
      const response = await apiClient.patch(`/groups/${groupId}`, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data.data
    },
    onSuccess: (_, { groupId }) => {
      // Invalidate group detail and groups list
      queryClient.invalidateQueries({ queryKey: queryKeys.groupDetail(groupId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.groups })
    },
  })
}

// Mutation: Delete group
export function useDeleteGroup() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (groupId: string): Promise<{ message: string }> => {
      const token = await getToken()
      const response = await apiClient.delete(`/groups/${groupId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data
    },
    onSuccess: () => {
      // Invalidate groups list
      queryClient.invalidateQueries({ queryKey: queryKeys.groups })
      router.replace('/groups')
    },
  })
}

// Query: Get active rooms for group
export function useGroupActiveRooms(groupId: string) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: queryKeys.activeRooms(groupId),
    queryFn: async (): Promise<GroupActiveRoomsResponse> => {
      const token = await getToken()
      const response = await apiClient.get(`/groups/${groupId}/rooms`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data.data
    },
    enabled: !!groupId && !!getToken,
  })
}

// Query: Get group leaderboard
export function useGroupLeaderboard(groupId: string, options?: { page?: number; limit?: number; sortBy?: 'totalPoints' | 'lastUpdated'; order?: 'asc' | 'desc' }) {
  const { getToken } = useAuth()

  const { page = 1, limit = 50, sortBy = 'totalPoints', order = 'desc' } = options || {}

  return useQuery({
    queryKey: [...queryKeys.leaderboard(groupId), { page, limit, sortBy, order }],
    queryFn: async (): Promise<LeaderboardResponse> => {
      const token = await getToken()
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        order,
      })
      const response = await apiClient.get(`/groups/${groupId}/leaderboard?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data.data
    },
    enabled: !!groupId && !!getToken,
  })
}

// Query: Get group activity
export function useGroupActivity(groupId: string, options?: { limit?: number }) {
  const { getToken } = useAuth()

  const { limit = 10 } = options || {}

  return useQuery({
    queryKey: [...queryKeys.groupDetail(groupId), 'activity', { limit }],
    queryFn: async (): Promise<GroupActivityResponse> => {
      const token = await getToken()
      const params = new URLSearchParams({
        limit: limit.toString(),
      })
      const response = await apiClient.get(`/groups/${groupId}/activity?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data.data
    },
    enabled: !!groupId && !!getToken,
  })
}