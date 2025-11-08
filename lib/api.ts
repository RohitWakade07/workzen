/**
 * API utility functions for making backend requests
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

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

    // Only set Content-Type for requests that have a body (not GET/HEAD).
    const method = (options.method || "GET").toUpperCase()
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    }

    if (authToken && !headers.Authorization) {
      headers.Authorization = `Bearer ${authToken}`
    }
    if (method !== "GET" && method !== "HEAD") {
      headers["Content-Type"] = "application/json"
    }

    const response = await fetch(url, {
      ...options,
      method,
      headers,
    })

    if (!response.ok) {
      // Try to read JSON error body, otherwise fall back to text/status
      const bodyText = await response.text().catch(() => response.statusText)
      let detail = response.statusText
      try {
        const json = JSON.parse(bodyText)
        detail = json.detail || json.message || bodyText
      } catch (e) {
        detail = bodyText || response.statusText
      }

      throw new Error(detail || `HTTP error! status: ${response.status}`)
    }

    // Parse JSON response safely
    const text = await response.text()
    const data = text ? JSON.parse(text) : {}
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

