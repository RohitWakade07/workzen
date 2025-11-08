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

export default function DashboardLayout() {
  const { user, logout } = useAuth()
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

  if (!user) {
    router.push("/login")
    return null
  }

  const renderPage = () => {
    // Employees page (admin only)
    if (pathname === "/employees") {
      if (user.role === "admin") {
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
        return <EmployeePayslips />
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
