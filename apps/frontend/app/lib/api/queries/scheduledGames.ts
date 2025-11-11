import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '../client'
import { queryKeys } from '../query-keys'
import { useRouter } from 'next/navigation'

type ScheduledGame = {
  id: string
  title: string
  description?: string | null
  startAt: string
  durationMinutes: number
  status: string
  roomId?: string | null
}

export function useGroupScheduledGames(groupId: string) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: queryKeys.scheduledGames(groupId),
    queryFn: async (): Promise<{ games: ScheduledGame[] }> => {
      const token = await getToken()
      const response = await apiClient.get(`/groups/${groupId}/scheduled-games`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data.data
    },
    enabled: !!groupId && !!getToken,
  })
}

export function useCreateScheduledGame(groupId: string) {
  const { getToken } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { title: string; description?: string; startAt: string; durationMinutes?: number }) => {
      const token = await getToken()
      const response = await apiClient.post(`/groups/${groupId}/scheduled-games`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.scheduledGames(groupId) })
    },
  })
}

export function useStartScheduledGame(groupId: string) {
  const { getToken } = useAuth()
  const qc = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      const response = await apiClient.post(`/groups/${groupId}/scheduled-games/${id}/start`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data.data
    },
    onSuccess: (data) => {
      // Refresh scheduled games and active rooms and group detail
      qc.invalidateQueries({ queryKey: queryKeys.scheduledGames(groupId) })
      qc.invalidateQueries({ queryKey: queryKeys.activeRooms(groupId) })
      qc.invalidateQueries({ queryKey: queryKeys.groupDetail(groupId) })

      // If a room code was returned, navigate to it
      if (data?.roomCode) {
        router.push(`/groups/${groupId}/rooms/${data.roomCode}`)
      }
    },
  })
}
