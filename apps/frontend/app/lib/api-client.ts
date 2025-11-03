'use client';

import { useAuth } from '@clerk/nextjs';
import { useMemo } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function useApiClient() {
  const { getToken } = useAuth();

  const api = useMemo(() => {
    const request = async <T>(
      endpoint: string,
      options: RequestInit = {}
    ): Promise<ApiResponse<T>> => {
      const url = `${API_BASE_URL}/api${endpoint}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      // Add auth token if available
      const token = await getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            error: data.error || {
              code: 'UNKNOWN_ERROR',
              message: 'An error occurred'
            }
          };
        }

        return { data };
      } catch (error) {
        return {
          error: {
            code: 'NETWORK_ERROR',
            message: 'Network request failed',
            details: error
          }
        };
      }
    };

    return {
      get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
      post: <T>(endpoint: string, data?: unknown) =>
        request<T>(endpoint, {
          method: 'POST',
          body: data ? JSON.stringify(data) : undefined,
        }),
      patch: <T>(endpoint: string, data?: unknown) =>
        request<T>(endpoint, {
          method: 'PATCH',
          body: data ? JSON.stringify(data) : undefined,
        }),
      delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
    };
  }, [getToken]);

  return api;
}