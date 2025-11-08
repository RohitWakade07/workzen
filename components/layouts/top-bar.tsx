"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@/lib/auth-context"
import { Menu, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

interface TopBarProps {
  onToggleSidebar: () => void
  user: User
  onLogout: () => void
}

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  hr_officer: "HR Officer",
  payroll_officer: "Payroll Officer",
  admin: "Administrator",
}

export default function TopBar({ onToggleSidebar, user, onLogout }: TopBarProps) {
  const router = useRouter()
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [statusDot, setStatusDot] = useState<"green" | "yellow" | "grey">("grey")

  const handleLogout = () => {
    onLogout()
    router.push("/login")
  }

  const handleCheckIn = () => {
    console.log("[v0] TopBar: Check-in initiated")
    setIsCheckedIn(true)
    setStatusDot("green")
    // TODO: Connect to attendance API
  }

  const handleCheckOut = () => {
    console.log("[v0] TopBar: Check-out initiated")
    setIsCheckedIn(false)
    setStatusDot("grey")
    // TODO: Connect to attendance API
  }

  const getStatusColor = () => {
    switch (statusDot) {
      case "green":
        return "bg-green-500"
      case "yellow":
        return "bg-yellow-500"
      case "grey":
        return "bg-slate-400"
    }
  }

  const getStatusTooltip = () => {
    switch (statusDot) {
      case "green":
        return "Checked In"
      case "yellow":
        return "Absent"
      case "grey":
        return "Checked Out"
    }
  }

  return (
    <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      </div>

      <div className="flex items-center gap-6">
        {(user.role === "employee" || user.role === "hr_officer") && (
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={isCheckedIn ? "outline" : "default"}
                onClick={handleCheckIn}
                disabled={isCheckedIn}
                className="text-xs"
              >
                Check In
              </Button>
              <Button
                size="sm"
                variant={!isCheckedIn ? "outline" : "default"}
                onClick={handleCheckOut}
                disabled={!isCheckedIn}
                className="text-xs"
              >
                Check Out
              </Button>
            </div>
            {/* Status Dot */}
            <div className={`w-4 h-4 rounded-full ${getStatusColor()} transition-colors`} title={getStatusTooltip()} />
          </div>
        )}

        <div className="text-right">
          <p className="font-medium text-foreground">{user.name}</p>
          <p className="text-sm text-muted-foreground">{ROLE_LABELS[user.role]}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-10 h-10 rounded-full bg-primary/20 border border-primary flex items-center justify-center hover:bg-primary/30 transition-colors cursor-pointer">
              <span className="text-sm font-bold text-primary">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push("/profile")}>My Profile</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut size={16} className="mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
