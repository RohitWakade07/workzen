"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

import { api, setAuthToken } from "@/lib/api"

export type UserRole = "employee" | "hr_officer" | "payroll_officer" | "admin"

export interface User {
  id: string
  email: string
  name?: string
  role: UserRole
  department?: string
  employeeId?: string
  companyName?: string
  phone?: string
  companyLogo?: string | null
}

interface CompanyData {
  companyName: string
  phone: string
  companyLogo?: string | null
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string, role: UserRole, companyData?: CompanyData) => Promise<void>
  logout: () => void
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthApiResponse {
  access_token: string
  token_type: string
  user: Record<string, unknown>
  expires_in: number
}

const AUTH_TOKEN_KEY = "auth_token"
const AUTH_USER_KEY = "auth_user"

function isBrowser() {
  return typeof window !== "undefined"
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      if (!isBrowser()) {
        return
      }

      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
      const storedUser = localStorage.getItem(AUTH_USER_KEY)

      if (storedToken) {
        setAuthToken(storedToken)
      }

      if (storedUser) {
        console.log("[v0] Auth: Restoring user from localStorage")
        setUser(JSON.parse(storedUser))
      }
    } catch (err) {
      console.log("[v0] Auth: Error restoring user", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const persistSession = (token: string, nextUser: User) => {
    setAuthToken(token)
    setUser(nextUser)

    if (isBrowser()) {
      localStorage.setItem(AUTH_TOKEN_KEY, token)
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
    }
  }

  const clearSession = () => {
    setAuthToken(null)
    setUser(null)

    if (isBrowser()) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_USER_KEY)
    }
  }

  const mapApiUserToUser = (apiUser: Record<string, unknown>): User => {
    const role = (apiUser.role as UserRole) || "employee"
    const fullName = (apiUser.name as string) || (apiUser.fullName as string) || (apiUser.displayName as string) || ""

    return {
      id: (apiUser.id as string) || "",
      email: (apiUser.email as string) || "",
      name: fullName || (apiUser.email as string) || "",
      role,
      department: (apiUser.department as string | undefined) ?? undefined,
      employeeId: (apiUser.employeeId as string | undefined) ?? (apiUser.employee_id as string | undefined) ?? undefined,
      companyName: (apiUser.companyName as string | undefined) ?? undefined,
      phone: (apiUser.phone as string | undefined) ?? undefined,
      companyLogo: (apiUser.companyLogo as string | null | undefined) ?? null,
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setError(null)
      setIsLoading(true)
      console.log("[v0] Auth: Starting login for", email)

      const response = await api.post<AuthApiResponse>("/api/auth/login", { email, password })

      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data?.access_token || !response.data.user) {
        throw new Error("Invalid login response from server")
      }

      const nextUser = mapApiUserToUser(response.data.user)
      persistSession(response.data.access_token, nextUser)
      console.log("[v0] Auth: Login successful via API for", email)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Login failed"
      console.log("[v0] Auth: Login error -", errorMsg)
      setError(errorMsg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const signup = async (email: string, password: string, name: string, role: UserRole, companyData?: CompanyData) => {
    try {
      setError(null)
      setIsLoading(true)
      console.log("[v0] Auth: Starting signup for", email, "with role", role)

      const payload: Record<string, unknown> = {
        email,
        password,
        name,
        role,
      }

      if (companyData) {
        payload.company = companyData
      }

      const response = await api.post<AuthApiResponse>("/api/auth/signup", payload)

      if (response.error) {
        throw new Error(response.error)
      }

      if (!response.data?.access_token || !response.data.user) {
        throw new Error("Invalid signup response from server")
      }

      const nextUser = mapApiUserToUser(response.data.user)
      persistSession(response.data.access_token, nextUser)
      console.log("[v0] Auth: Signup successful via API for", email)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Signup failed"
      console.log("[v0] Auth: Signup error -", errorMsg)
      setError(errorMsg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    console.log("[v0] Auth: Logout initiated")
    clearSession()
    void api.post("/api/auth/logout")
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, error }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
