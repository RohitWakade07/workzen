"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, Download } from "lucide-react"

interface ReportsPageProps {
  role: string
}

export default function ReportsPage({ role }: ReportsPageProps) {
  console.log("[v0] ReportsPage: Rendered for role", role)

  const reports = [
    {
      id: "report_1",
      title: "Monthly Attendance Report",
      description: "View attendance trends and patterns across the organization",
      icon: <BarChart3 size={24} />,
    },
    {
      id: "report_2",
      title: "Payroll Summary Report",
      description: "Detailed breakdown of payroll transactions and deductions",
      icon: <BarChart3 size={24} />,
    },
    {
      id: "report_3",
      title: "Leave Balance Report",
      description: "Employee leave balance and utilization across departments",
      icon: <BarChart3 size={24} />,
    },
    {
      id: "report_4",
      title: "Departmental Analytics",
      description: "Performance metrics and statistics by department",
      icon: <BarChart3 size={24} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">Generate and view system reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => (
          <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="text-primary">{report.icon}</div>
              <Button size="sm" variant="outline" className="gap-2 bg-transparent">
                <Download size={16} />
                Download
              </Button>
            </div>
            <h3 className="font-semibold text-foreground mb-2">{report.title}</h3>
            <p className="text-sm text-muted-foreground">{report.description}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
