"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Calendar, DollarSign, AlertCircle, FileText } from "lucide-react"
import AttendanceModule from "@/components/employee/attendance-module"
import TimeOffModule from "@/components/employee/time-off-module"
import PayslipModule from "@/components/employee/payslip-module"

export default function EmployeeDashboard() {
  console.log("[v0] EmployeeDashboard: Rendered")
  const [activeTab, setActiveTab] = useState<"overview" | "attendance" | "timeoff" | "payslips">("overview")

  // Mock data - will be replaced with API calls
  const stats = [
    { icon: <Clock size={24} />, label: "Hours This Week", value: "38.5", unit: "hrs" },
    { icon: <Calendar size={24} />, label: "Leave Balance", value: "12", unit: "days" },
    { icon: <DollarSign size={24} />, label: "YTD Earnings", value: "$45,250", unit: "" },
  ]

  const recentActivity = [
    { date: "Today", action: "Checked in at 9:00 AM" },
    { date: "Yesterday", action: "Submitted time off request for 1 day" },
    { date: "2 days ago", action: "Payslip generated for November" },
  ]

  if (activeTab === "attendance") {
    return <AttendanceModule onBack={() => setActiveTab("overview")} />
  }

  if (activeTab === "timeoff") {
    return <TimeOffModule onBack={() => setActiveTab("overview")} />
  }

  if (activeTab === "payslips") {
    return <PayslipModule onBack={() => setActiveTab("overview")} />
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
          <Button onClick={() => setActiveTab("attendance")} className="w-full justify-center" variant="default">
            <Clock className="mr-2" size={18} />
            Check Attendance
          </Button>
          <Button onClick={() => setActiveTab("timeoff")} className="w-full justify-center" variant="default">
            <Calendar className="mr-2" size={18} />
            Manage Time Off
          </Button>
          <Button onClick={() => setActiveTab("payslips")} className="w-full justify-center" variant="default">
            <FileText className="mr-2" size={18} />
            View Payslips
          </Button>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex justify-between items-center pb-3 border-b last:border-b-0">
                <div>
                  <p className="font-medium text-foreground">{item.action}</p>
                  <p className="text-sm text-muted-foreground">{item.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-yellow-900">
            <AlertCircle size={20} />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-800 text-sm">No pending alerts. Keep up the good work!</CardContent>
      </Card>
    </div>
  )
}
