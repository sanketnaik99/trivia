// Shared API response types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: ApiError
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

// Pagination types
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}