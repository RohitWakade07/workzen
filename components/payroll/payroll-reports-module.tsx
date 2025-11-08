"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Filter } from "lucide-react"

interface PayrollReportsModuleProps {
  onBack: () => void
}

interface PayrollReport {
  id: string
  name: string
  month: string
  year: number
  generatedDate: string
  status: string
  description: string
}

export default function PayrollReportsModule({ onBack }: PayrollReportsModuleProps) {
  console.log("[v0] PayrollReportsModule: Rendered")

  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [reports, setReports] = useState<PayrollReport[]>([
    {
      id: "rep_001",
      name: "November 2025 Payroll Report",
      month: "November",
      year: 2025,
      generatedDate: "2025-11-08",
      status: "Final",
      description: "156 employees, $287.5K total",
    },
    {
      id: "rep_002",
      name: "October 2025 Payroll Report",
      month: "October",
      year: 2025,
      generatedDate: "2025-10-31",
      status: "Final",
      description: "156 employees, $287.5K total",
    },
    {
      id: "rep_003",
      name: "September 2025 Payroll Report",
      month: "September",
      year: 2025,
      generatedDate: "2025-09-30",
      status: "Final",
      description: "156 employees, $287.5K total",
    },
  ])

  const handleDownload = (report: PayrollReport) => {
    console.log("[v0] PayrollReportsModule: Downloading report", report.id)
    console.log("[v0] PayrollReportsModule: Report file download initiated for", report.name)
  }

  const summaryStats = [
    { label: "Total Payroll YTD", value: "$1,247,500", color: "text-green-600" },
    { label: "Total Employees", value: "156", color: "text-blue-600" },
    { label: "Average Salary", value: "$2,843", color: "text-purple-600" },
    { label: "Reports Generated", value: "11", color: "text-orange-600" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="icon">
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold text-foreground">Payroll Reports</h2>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summaryStats.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Year</label>
            <div className="flex gap-2">
              {[2023, 2024, 2025].map((year) => (
                <Button
                  key={year}
                  onClick={() => setFilterYear(year)}
                  variant={filterYear === year ? "default" : "outline"}
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Reports ({reports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">{report.name}</p>
                  <p className="text-sm text-muted-foreground mb-1">{report.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Generated: {new Date(report.generatedDate).toLocaleDateString()} • Status:{" "}
                    <span className="font-medium">{report.status}</span>
                  </p>
                </div>
                <Button onClick={() => handleDownload(report)} size="sm" variant="outline">
                  <Download size={16} className="mr-1" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Generation */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Generate New Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Generate custom payroll reports for analysis and audit purposes.
          </p>
          <Button className="w-full">Generate Custom Report</Button>
        </CardContent>
      </Card>
    </div>
  )
}
