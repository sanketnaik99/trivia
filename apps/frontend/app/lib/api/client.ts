import axios from 'axios'

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api` || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common error cases
    if (error.response?.status === 401) {
      console.error('Unauthorized - token may be expired')
    } else if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data)
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timeout')
    }

    return Promise.reject(error)
  }
)