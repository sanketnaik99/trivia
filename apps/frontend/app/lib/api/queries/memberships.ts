import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '../client'
import { queryKeys } from '../query-keys'
import type {
  RemoveMemberResponse,
  PromoteMemberResponse,
  LeaveGroupResponse
} from '../schemas/membership.schema'

// Mutation: Leave group
export function useLeaveGroup() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (groupId: string): Promise<LeaveGroupResponse> => {
      const token = await getToken()
      const response = await apiClient.post(`/groups/${groupId}/leave`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data
    },
    onSuccess: (_, groupId) => {
      // Invalidate groups list and group detail
      queryClient.invalidateQueries({ queryKey: queryKeys.groups })
      queryClient.invalidateQueries({ queryKey: queryKeys.groupDetail(groupId) })
    },
  })
}

// Mutation: Remove member
export function useRemoveMember() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      groupId,
      userId
    }: {
      groupId: string
      userId: string
    }): Promise<RemoveMemberResponse> => {
      const token = await getToken()
      const response = await apiClient.delete(`/groups/${groupId}/members/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data
    },
    onSuccess: (_, { groupId }) => {
      // Invalidate group detail to refresh member list
      queryClient.invalidateQueries({ queryKey: queryKeys.groupDetail(groupId) })
    },
  })
}

// Mutation: Promote member to admin
export function usePromoteMember() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      groupId,
      userId
    }: {
      groupId: string
      userId: string
    }): Promise<PromoteMemberResponse> => {
      const token = await getToken()
      const response = await apiClient.post(`/groups/${groupId}/members/${userId}/promote`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data
    },
    onSuccess: (_, { groupId }) => {
      // Invalidate group detail to refresh member roles
      queryClient.invalidateQueries({ queryKey: queryKeys.groupDetail(groupId) })
    },
  })
}