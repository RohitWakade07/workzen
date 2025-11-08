"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import AuthPage from "@/components/auth/auth-page"
import { useAuth } from "@/lib/auth-context"
import DashboardLayout from "@/components/layouts/dashboard-layout"

export default function Home() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return <DashboardLayout />
}
