"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload } from "lucide-react"

interface SignupFormProps {
  onSwitchToLogin: () => void
}

export default function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { signup, error } = useAuth()

  const handleLogoClick = () => {
    fileInputRef.current?.click()
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log("[v0] SignupForm: Logo file selected", file.name)
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setCompanyLogo(result)
        console.log("[v0] SignupForm: Logo uploaded successfully")
      }
      reader.readAsDataURL(file)
    }
  }

  const validateForm = () => {
    console.log("[v0] SignupForm: Validating form data")
    if (!companyName.trim()) {
      setPasswordError("Company name is required")
      return false
    }
    if (!fullName.trim()) {
      setPasswordError("Full name is required")
      return false
    }
    if (!email.trim() || !email.includes("@")) {
      setPasswordError("Valid email is required")
      return false
    }
    if (!phone.trim()) {
      setPasswordError("Phone number is required")
      return false
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return false
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return false
    }
    setPasswordError("")
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!validateForm()) {
        console.log("[v0] SignupForm: Form validation failed")
        return
      }

      setIsLoading(true)
      console.log("[v0] SignupForm: Attempting admin signup for company", companyName)

      // Pass company data along with signup
      await signup(email, password, fullName, "admin", {
        companyName,
        phone,
        companyLogo,
      })
    } catch (err) {
      console.log("[v0] SignupForm: Signup failed -", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-2xl font-bold text-foreground">Create Company Account</h2>
      <p className="text-sm text-muted-foreground">
        Set up your company and admin account to get started with WorkZen HRMS
      </p>

      {error && <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">{error}</div>}
      {passwordError && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">{passwordError}</div>
      )}

      {/* Company Logo Upload */}
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={handleLogoClick}
          className="w-24 h-24 rounded-full border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition flex items-center justify-center cursor-pointer overflow-hidden bg-muted/30"
        >
          {companyLogo ? (
            <img src={companyLogo || "/placeholder.svg"} alt="Company Logo" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload size={20} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Click to add</span>
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoChange}
          className="hidden"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground text-center">Company Logo (Optional)</p>
      </div>

      {/* Company Name */}
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-foreground mb-1">
          Company Name
        </label>
        <Input
          id="companyName"
          type="text"
          placeholder="Acme Corporation"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      {/* Full Name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-foreground mb-1">
          Full Name
        </label>
        <Input
          id="fullName"
          type="text"
          placeholder="John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="admin@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
          Phone Number
        </label>
        <Input
          id="phone"
          type="tel"
          placeholder="+1 (555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
          Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      {/* Confirm Password */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Creating Account..." : "Create Company Account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button type="button" onClick={onSwitchToLogin} className="text-primary hover:underline font-medium">
          Sign in
        </button>
      </p>
    </form>
  )
}
