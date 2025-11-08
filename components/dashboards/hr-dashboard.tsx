"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, FileText, AlertCircle, CheckCircle } from "lucide-react"
import EmployeeManagementModule from "@/components/hr/employee-management-module"
import LeaveAllocationModule from "@/components/hr/leave-allocation-module"
import LeaveApprovalsModule from "@/components/hr/leave-approvals-module"

export default function HRDashboard() {
  console.log("[v0] HRDashboard: Rendered")

  const [activeTab, setActiveTab] = useState<"overview" | "employees" | "allocations" | "approvals">("overview")

  const stats = [
    { icon: <Users size={24} />, label: "Total Employees", value: "156", unit: "" },
    { icon: <FileText size={24} />, label: "Pending Approvals", value: "8", unit: "requests" },
    { icon: <AlertCircle size={24} />, label: "Leave Allocated", value: "94%", unit: "team" },
  ]

  const recentActivities = [
    { action: "Leave request approved", employee: "John Doe", date: "Today" },
    { action: "Employee onboarded", employee: "Jane Smith", date: "2 days ago" },
    { action: "Leave allocation updated", employee: "Engineering Team", date: "3 days ago" },
  ]

  if (activeTab === "employees") {
    return <EmployeeManagementModule onBack={() => setActiveTab("overview")} />
  }

  if (activeTab === "allocations") {
    return <LeaveAllocationModule onBack={() => setActiveTab("overview")} />
  }

  if (activeTab === "approvals") {
    return <LeaveApprovalsModule onBack={() => setActiveTab("overview")} />
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
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Button onClick={() => setActiveTab("employees")} className="w-full justify-center" variant="default">
            <Users className="mr-2" size={18} />
            Manage Employees
          </Button>
          <Button onClick={() => setActiveTab("allocations")} className="w-full justify-center" variant="default">
            <FileText className="mr-2" size={18} />
            Leave Allocation
          </Button>
          <Button onClick={() => setActiveTab("approvals")} className="w-full justify-center" variant="default">
            <CheckCircle className="mr-2" size={18} />
            Approve Requests
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.map((activity, i) => (
              <div key={i} className="flex justify-between items-center pb-3 border-b last:border-b-0">
                <div>
                  <p className="font-medium text-foreground">{activity.action}</p>
                  <p className="text-sm text-muted-foreground">{activity.employee}</p>
                </div>
                <p className="text-sm text-muted-foreground">{activity.date}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
