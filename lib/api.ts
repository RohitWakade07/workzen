/**
 * API utility functions for making backend requests
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface ApiResponse<T> {
  data?: T
  error?: string
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }))
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    console.error(`[API] Error fetching ${endpoint}:`, error)
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }
  }
}

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: "DELETE" }),
}

