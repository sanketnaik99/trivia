import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '../client'
import { queryKeys } from '../query-keys'
import type {
  InviteListResponse,
  GenerateInviteRequest,
  GenerateInviteResponse,
  AcceptInviteResponse,
  RevokeInviteResponse
} from '../schemas/invite.schema'

// Query: Get group invites
export function useGroupInvites(groupId: string) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: queryKeys.invites(groupId),
    queryFn: async (): Promise<InviteListResponse> => {
      const token = await getToken()
      const response = await apiClient.get(`/groups/${groupId}/invites`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data.data
    },
    enabled: !!groupId && !!getToken,
  })
}

// Mutation: Generate invite
export function useGenerateInvite() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      groupId,
      data
    }: {
      groupId: string
      data: GenerateInviteRequest
    }): Promise<GenerateInviteResponse> => {
      const token = await getToken()
      const response = await apiClient.post(`/groups/${groupId}/invites`, data, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data.data
    },
    onSuccess: (_, { groupId }) => {
      // Invalidate invites list
      queryClient.invalidateQueries({ queryKey: queryKeys.invites(groupId) })
    },
  })
}

// Mutation: Revoke invite
export function useRevokeInvite() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      groupId,
      inviteId
    }: {
      groupId: string
      inviteId: string
    }): Promise<RevokeInviteResponse> => {
      const token = await getToken()
      const response = await apiClient.delete(`/groups/${groupId}/invites/${inviteId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data
    },
    onSuccess: (_, { groupId }) => {
      // Invalidate invites list for this group
      queryClient.invalidateQueries({ queryKey: queryKeys.invites(groupId) })
    },
  })
}

// Mutation: Accept invite by token
export function useAcceptInvite() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (token: string): Promise<AcceptInviteResponse> => {
      const authToken = await getToken()
      const response = await apiClient.post(`/invites/${token}/accept`, {}, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      })
      return response.data.data
    },
    onSuccess: () => {
      // Invalidate groups list to show new membership
      queryClient.invalidateQueries({ queryKey: queryKeys.groups })
    },
  })
}

// Mutation: Accept invite by code
export function useAcceptInviteCode() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (code: string): Promise<AcceptInviteResponse> => {
      const token = await getToken()
      const response = await apiClient.post(`/invites/code/${code}/accept`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data.data
    },
    onSuccess: () => {
      // Invalidate groups list to show new membership
      queryClient.invalidateQueries({ queryKey: queryKeys.groups })
    },
  })
}