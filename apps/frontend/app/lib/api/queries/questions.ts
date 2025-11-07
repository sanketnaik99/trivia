import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '../client'

// Query: Get question categories with counts
export function useQuestionCategories(enabled = true) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['questions', 'categories'],
    queryFn: async (): Promise<Array<{ category: string; count: number }>> => {
      const token = await getToken()
      const response = await apiClient.get('/questions/categories', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      // Backend returns { success: true, categories: [...] }
      // Return the `categories` array for the hook consumers
      return response.data.categories as Array<{ category: string; count: number }>
    },
    enabled: Boolean(enabled),
  })
}
