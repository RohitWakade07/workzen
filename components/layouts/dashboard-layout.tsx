"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useIsMobile } from "@/hooks/use-mobile"
import Sidebar from "./sidebar"
import TopBar from "./top-bar"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import EmployeePayslips from "@/components/employee/payslip-module"
import EmployeesGrid from "@/components/pages/employees-page"
import AttendanceView from "@/components/pages/attendance-page"
import TimeOffView from "@/components/pages/time-off-page"
import PayrollView from "@/components/pages/payroll-page"
import ReportsPage from "@/components/pages/reports-page"
import SettingsPage from "@/components/pages/settings-page"
import ProfilePage from "@/components/pages/profile-page"

export default function DashboardLayout() {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Close sidebar on mobile by default
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    } else {
      setSidebarOpen(true)
    }
  }, [isMobile])

  console.log("[v0] DashboardLayout: Current pathname", pathname, "User role", user?.role)

  useEffect(() => {
    if (!user && !isLoading) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
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
    return null
  }

  const renderPage = () => {
    // Employees page (admin only)
    if (pathname === "/employees") {
      if (user.role === "admin" || user.role === "hr_officer" || user.role === "payroll_officer") {
        return <EmployeesGrid />
      }
      return <div className="text-center py-8">You don't have access to this page</div>
    }

    // Attendance page
    if (pathname === "/attendance") {
      if (user.role === "admin" || user.role === "employee" || user.role === "hr_officer") {
        return <AttendanceView role={user.role} />
      }
      return <div className="text-center py-8">You don't have access to this page</div>
    }

    // Time Off page
    if (pathname === "/time-off") {
      if (
        user.role === "admin" ||
        user.role === "employee" ||
        user.role === "payroll_officer" ||
        user.role === "hr_officer"
      ) {
        return <TimeOffView role={user.role} />
      }
      return <div className="text-center py-8">You don't have access to this page</div>
    }

    // Payroll page
    if (pathname === "/payroll") {
      if (user.role === "admin" || user.role === "payroll_officer") {
        return <PayrollView />
      }
      return <div className="text-center py-8">You don't have access to this page</div>
    }

    // Payslips (employee view)
    if (pathname === "/payslips") {
      if (user.role === "employee") {
        return <EmployeePayslips onBack={() => router.push("/")} />
      }
      return <div className="text-center py-8">You don't have access to this page</div>
    }

    // Reports page
    if (pathname === "/reports") {
      if (user.role === "admin" || user.role === "payroll_officer") {
        return <ReportsPage role={user.role} />
      }
      return <div className="text-center py-8">You don't have access to this page</div>
    }

    // Settings page
    if (pathname === "/settings") {
      if (user.role === "admin") {
        return <SettingsPage />
      }
      return <div className="text-center py-8">You don't have access to this page</div>
    }

    // Profile page
    if (pathname === "/profile") {
      return <ProfilePage />
    }

    // Default: show dashboard based on role
    return <div className="text-center py-8">Welcome to WorkZen HRMS</div>
  }

  const sidebarContent = (
    <Sidebar
      isOpen={sidebarOpen}
      role={user.role}
      currentPage={pathname}
      onLinkClick={() => {
        if (isMobile) {
          setSidebarOpen(false)
        }
      }}
    />
  )

  return (
    <div className="flex h-screen bg-background">
      {isMobile ? (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      ) : (
        sidebarContent
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} user={user} onLogout={logout} />
        <main className="flex-1 overflow-auto">
          <div className="p-6">{renderPage()}</div>
        </main>
      </div>
    </div>
  )
}
