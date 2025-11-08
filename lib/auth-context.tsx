"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type UserRole = "employee" | "hr_officer" | "payroll_officer" | "admin"

export interface User {
  id: string
  email: string
  name: string
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("auth_user")
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

  const login = async (email: string, password: string) => {
    try {
      setError(null)
      setIsLoading(true)
      console.log("[v0] Auth: Starting login for", email)

      if (email === "admin@test.com" && password === "password") {
        const mockUser: User = {
          id: "admin_001",
          email,
          name: "Admin User",
          role: "admin",
          companyName: "Test Company",
          phone: "+1 (555) 000-0001",
        }
        setUser(mockUser)
        localStorage.setItem("auth_user", JSON.stringify(mockUser))
        console.log("[v0] Auth: Admin login successful (mock)")
      } else if (email === "hr@test.com" && password === "password") {
        const mockUser: User = {
          id: "hr_001",
          email,
          name: "Jane HR",
          role: "hr_officer",
          department: "Human Resources",
        }
        setUser(mockUser)
        localStorage.setItem("auth_user", JSON.stringify(mockUser))
        console.log("[v0] Auth: Login successful (mock)")
      } else if (email === "payroll@test.com" && password === "password") {
        const mockUser: User = {
          id: "payroll_001",
          email,
          name: "Bob Payroll",
          role: "payroll_officer",
          department: "Payroll",
        }
        setUser(mockUser)
        localStorage.setItem("auth_user", JSON.stringify(mockUser))
        console.log("[v0] Auth: Login successful (mock)")
      } else if (email === "employee@test.com" && password === "password") {
        const mockUser: User = {
          id: "emp_001",
          email,
          name: "John Employee",
          role: "employee",
          employeeId: "EMP001",
          department: "Engineering",
        }
        setUser(mockUser)
        localStorage.setItem("auth_user", JSON.stringify(mockUser))
        console.log("[v0] Auth: Login successful (mock)")
      } else {
        throw new Error("Invalid credentials")
      }
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

      if (role !== "admin") {
        throw new Error("Only admin accounts can be created. Other users must be added by admin.")
      }

      if (!companyData) {
        throw new Error("Company data is required for admin signup")
      }

      // Validate company data
      if (!companyData.companyName || !companyData.phone) {
        throw new Error("Company name and phone are required")
      }

      const newUser: User = {
        id: `admin_${Date.now()}`,
        email,
        name,
        role: "admin",
        companyName: companyData.companyName,
        phone: companyData.phone,
        companyLogo: companyData.companyLogo || null,
      }
      setUser(newUser)
      localStorage.setItem("auth_user", JSON.stringify(newUser))
      console.log("[v0] Auth: Admin signup successful (mock) for company", companyData.companyName)
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
    setUser(null)
    localStorage.removeItem("auth_user")
    // Redirect will be handled by the component using logout
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
