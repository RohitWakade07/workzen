"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DollarSign, BarChart, Clock, CheckCircle } from "lucide-react"
import PayrunModule from "@/components/payroll/payrun-module"
import PayrollApprovalsModule from "@/components/payroll/payroll-approvals-module"
import PayrollReportsModule from "@/components/payroll/payroll-reports-module"

export default function PayrollDashboard() {
  console.log("[v0] PayrollDashboard: Rendered")

  const [activeTab, setActiveTab] = useState<"overview" | "payrun" | "approvals" | "reports">("overview")

  const stats = [
    { icon: <DollarSign size={24} />, label: "Current Payroll", value: "$287K", unit: "total" },
    { icon: <Clock size={24} />, label: "Pending Approvals", value: "2", unit: "payrun" },
    { icon: <BarChart size={24} />, label: "Processed YTD", value: "$1.2M", unit: "" },
  ]

  const recentPayruns = [
    { month: "November 2025", status: "processing", employees: 156 },
    { month: "October 2025", status: "completed", employees: 156 },
    { month: "September 2025", status: "completed", employees: 156 },
  ]

  if (activeTab === "payrun") {
    return <PayrunModule onBack={() => setActiveTab("overview")} />
  }

  if (activeTab === "approvals") {
    return <PayrollApprovalsModule onBack={() => setActiveTab("overview")} />
  }

  if (activeTab === "reports") {
    return <PayrollReportsModule onBack={() => setActiveTab("overview")} />
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
          <Button onClick={() => setActiveTab("payrun")} className="w-full justify-center" variant="default">
            <DollarSign className="mr-2" size={18} />
            Create Payrun
          </Button>
          <Button onClick={() => setActiveTab("approvals")} className="w-full justify-center" variant="default">
            <CheckCircle className="mr-2" size={18} />
            Review Approvals
          </Button>
          <Button onClick={() => setActiveTab("reports")} className="w-full justify-center" variant="default">
            <BarChart className="mr-2" size={18} />
            View Reports
          </Button>
        </CardContent>
      </Card>

      {/* Recent Payruns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payruns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentPayruns.map((payrun, i) => (
              <div key={i} className="flex justify-between items-center pb-3 border-b last:border-b-0">
                <div>
                  <p className="font-medium text-foreground">{payrun.month}</p>
                  <p className="text-sm text-muted-foreground">{payrun.employees} employees</p>
                </div>
                <span
                  className={`text-xs font-medium px-3 py-1 rounded ${
                    payrun.status === "completed" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {payrun.status === "completed" ? "Completed" : "Processing"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Clock size={20} />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 text-sm">
          2 payruns awaiting admin approval. All employees processed successfully.
        </CardContent>
      </Card>
    </div>
  )
}
