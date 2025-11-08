"use client"

import { useState } from "react"
import LoginForm from "./login-form"
import SignupForm from "./signup-form"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">WorkZen HRMS</h1>
          <p className="text-muted-foreground">Enterprise Human Resource Management System</p>
        </div>

        <div className="bg-card rounded-lg shadow-lg border border-border p-8">
          {isLogin ? (
            <LoginForm onSwitchToSignup={() => setIsLogin(false)} />
          ) : (
            <SignupForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Demo credentials: admin@test.com | hr@test.com | payroll@test.com | employee@test.com (all with password:
          password)
        </p>
      </div>
    </div>
  )
}
