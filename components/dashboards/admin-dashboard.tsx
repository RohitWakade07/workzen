"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Settings, BarChart, CheckCircle, UserPlus } from "lucide-react"
import UserManagementModule from "@/components/admin/user-management-module"
import SystemSettingsModule from "@/components/admin/system-settings-module"
import AuditLogsModule from "@/components/admin/audit-logs-module"
import AddTeamMembersModule from "@/components/admin/add-team-members-module"

export default function AdminDashboard() {
  console.log("[v0] AdminDashboard: Rendered")

  const [activeTab, setActiveTab] = useState<"overview" | "users" | "settings" | "audit" | "team">("overview")

  const stats = [
    { icon: <Users size={24} />, label: "Active Users", value: "210", unit: "accounts" },
    { icon: <Settings size={24} />, label: "System Health", value: "99.9%", unit: "uptime" },
    { icon: <BarChart size={24} />, label: "API Calls", value: "2.4M", unit: "today" },
  ]

  const systemStatus = [
    { component: "Database", status: "operational", lastCheck: "2 mins ago" },
    { component: "API Gateway", status: "operational", lastCheck: "1 min ago" },
    { component: "Authentication", status: "operational", lastCheck: "3 mins ago" },
    { component: "Email Service", status: "operational", lastCheck: "5 mins ago" },
  ]

  if (activeTab === "team") {
    return <AddTeamMembersModule onBack={() => setActiveTab("overview")} />
  }

  if (activeTab === "users") {
    return <UserManagementModule onBack={() => setActiveTab("overview")} />
  }

  if (activeTab === "settings") {
    return <SystemSettingsModule onBack={() => setActiveTab("overview")} />
  }

  if (activeTab === "audit") {
    return <AuditLogsModule onBack={() => setActiveTab("overview")} />
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className="text-primary">{stat.icon}</span>
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{stat.value}</span>
                <span className="text-muted-foreground">{stat.unit}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Button onClick={() => setActiveTab("team")} className="w-full justify-center" variant="default">
            <UserPlus className="mr-2" size={18} />
            Add Team Members
          </Button>
          <Button onClick={() => setActiveTab("users")} className="w-full justify-center" variant="default">
            <Users className="mr-2" size={18} />
            Manage Users
          </Button>
          <Button onClick={() => setActiveTab("settings")} className="w-full justify-center" variant="default">
            <Settings className="mr-2" size={18} />
            System Settings
          </Button>
          <Button onClick={() => setActiveTab("audit")} className="w-full justify-center" variant="default">
            <BarChart className="mr-2" size={18} />
            Audit Logs
          </Button>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle size={20} className="text-green-600" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {systemStatus.map((item, i) => (
              <div key={i} className="flex items-center justify-between pb-3 border-b last:border-b-0">
                <div>
                  <p className="font-medium text-foreground">{item.component}</p>
                  <p className="text-sm text-muted-foreground">Last check: {item.lastCheck}</p>
                </div>
                <span className="px-3 py-1 rounded text-xs font-medium bg-green-100 text-green-800">{item.status}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent System Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">• New team member invited: sarah.johnson@company.com</p>
            <p className="text-muted-foreground">• Admin approved November payroll</p>
            <p className="text-muted-foreground">• System backup completed successfully</p>
            <p className="text-muted-foreground">• User role updated: john.doe@company.com</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
