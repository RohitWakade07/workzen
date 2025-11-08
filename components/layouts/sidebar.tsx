"use client"

import type React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth, type UserRole } from "@/lib/auth-context"
import { Users, Clock, FileText, DollarSign, BarChart3, Settings, LogOut } from "lucide-react"

interface SidebarProps {
  isOpen: boolean
  role: UserRole
  currentPage: string
  onLinkClick?: () => void
}

const MENU_ITEMS: Record<UserRole, Array<{ icon: React.ReactNode; label: string; href: string; roles: UserRole[] }>> = {
  employee: [
    { icon: <Clock size={20} />, label: "Attendance", href: "/attendance", roles: ["employee"] },
    { icon: <FileText size={20} />, label: "Time Off", href: "/time-off", roles: ["employee"] },
    { icon: <DollarSign size={20} />, label: "Payslips", href: "/payslips", roles: ["employee"] },
  ],
  hr_officer: [
    { icon: <Users size={20} />, label: "Employees", href: "/employees", roles: ["admin", "hr_officer"] },
    { icon: <Clock size={20} />, label: "Attendance", href: "/attendance", roles: ["admin", "hr_officer"] },
    { icon: <FileText size={20} />, label: "Time Off", href: "/time-off", roles: ["admin", "hr_officer"] },
    { icon: <DollarSign size={20} />, label: "Payroll", href: "/payroll", roles: ["admin", "payroll_officer"] },
    { icon: <BarChart3 size={20} />, label: "Reports", href: "/reports", roles: ["admin"] },
    { icon: <Settings size={20} />, label: "Settings", href: "/settings", roles: ["admin"] },
  ],
  payroll_officer: [
    { icon: <DollarSign size={20} />, label: "Payroll", href: "/payroll", roles: ["admin", "payroll_officer"] },
    { icon: <FileText size={20} />, label: "Time Off", href: "/time-off", roles: ["admin", "payroll_officer"] },
    { icon: <BarChart3 size={20} />, label: "Reports", href: "/reports", roles: ["admin", "payroll_officer"] },
  ],
  admin: [
    { icon: <Users size={20} />, label: "Employees", href: "/employees", roles: ["admin"] },
    { icon: <Clock size={20} />, label: "Attendance", href: "/attendance", roles: ["admin"] },
    { icon: <FileText size={20} />, label: "Time Off", href: "/time-off", roles: ["admin"] },
    { icon: <DollarSign size={20} />, label: "Payroll", href: "/payroll", roles: ["admin"] },
    { icon: <BarChart3 size={20} />, label: "Reports", href: "/reports", roles: ["admin"] },
    { icon: <Settings size={20} />, label: "Settings", href: "/settings", roles: ["admin"] },
  ],
}

export default function Sidebar({ isOpen, role, currentPage, onLinkClick }: SidebarProps) {
  const { logout } = useAuth()
  const router = useRouter()
  const menuItems = MENU_ITEMS[role].filter((item) => item.roles.includes(role))

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  console.log(
    "[v0] Sidebar: Rendering for role",
    role,
    "with items",
    menuItems.map((i) => i.label),
  )

  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick()
    }
  }

  return (
    <aside
      className={`${
        isOpen ? "w-64" : "w-20"
      } bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 flex flex-col overflow-hidden`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-center">
        <div className={`${isOpen ? "text-lg font-bold" : "text-2xl"}`}>{isOpen ? "WorkZen" : "WZ"}</div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleLinkClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentPage === item.href
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
            title={!isOpen ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {isOpen && <span className="text-sm font-medium">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
          title={!isOpen ? "Logout" : undefined}
        >
          <LogOut size={20} />
          {isOpen && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  )
}
