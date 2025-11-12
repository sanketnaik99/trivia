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
  recurrence?: {
    type?: string
    interval?: number
    byDay?: string[]
    count?: number
    until?: string
  } | null
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
    mutationFn: async (payload: { title: string; description?: string | null; startAt: string; durationMinutes?: number; recurrence?: any | null }) => {
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
    mutationFn: async (payload: { id: string; selectedCategory?: string | null; feedbackMode?: 'supportive' | 'neutral' | 'roast' }) => {
      const { id, selectedCategory, feedbackMode } = payload
      const token = await getToken()
      const body: Record<string, unknown> = {}
      if (selectedCategory) body.selectedCategory = selectedCategory
      if (feedbackMode) body.feedbackMode = feedbackMode
      const response = await apiClient.post(`/groups/${groupId}/scheduled-games/${id}/start`, body, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return response.data.data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.scheduledGames(groupId) })
      qc.invalidateQueries({ queryKey: queryKeys.activeRooms(groupId) })
      qc.invalidateQueries({ queryKey: queryKeys.groupDetail(groupId) })
      if (data?.roomCode) {
        router.push(`/groups/${groupId}/rooms/${data.roomCode}`)
      }
    },
  })
}
