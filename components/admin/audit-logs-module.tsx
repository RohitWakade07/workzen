"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Search, Filter } from "lucide-react"

interface AuditLogsModuleProps {
  onBack: () => void
}

interface AuditLog {
  id: string
  timestamp: string
  user: string
  action: string
  resource: string
  status: "success" | "failure"
  ipAddress: string
  details: string
}

export default function AuditLogsModule({ onBack }: AuditLogsModuleProps) {
  console.log("[v0] AuditLogsModule: Rendered")

  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [logs, setLogs] = useState<AuditLog[]>([
    {
      id: "log_001",
      timestamp: "2025-11-08 10:30:45",
      user: "john.doe@company.com",
      action: "Login",
      resource: "User Authentication",
      status: "success",
      ipAddress: "192.168.1.100",
      details: "User logged in successfully",
    },
    {
      id: "log_002",
      timestamp: "2025-11-08 10:28:12",
      user: "jane.hr@company.com",
      action: "Create",
      resource: "Employee Record",
      status: "success",
      ipAddress: "192.168.1.105",
      details: "New employee added: sarah.johnson@company.com",
    },
    {
      id: "log_003",
      timestamp: "2025-11-08 10:15:33",
      user: "admin@company.com",
      action: "Approve",
      resource: "Payroll",
      status: "success",
      ipAddress: "192.168.1.110",
      details: "November 2025 payroll approved",
    },
    {
      id: "log_004",
      timestamp: "2025-11-08 09:45:22",
      user: "bob.payroll@company.com",
      action: "Export",
      resource: "Payroll Report",
      status: "success",
      ipAddress: "192.168.1.108",
      details: "Payroll report exported as PDF",
    },
    {
      id: "log_005",
      timestamp: "2025-11-08 09:20:15",
      user: "unknown",
      action: "Login",
      resource: "User Authentication",
      status: "failure",
      ipAddress: "192.168.1.200",
      details: "Failed login attempt - invalid credentials",
    },
  ])

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || log.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const getActionColor = (action: string) => {
    switch (action) {
      case "Login":
        return "bg-blue-100 text-blue-800"
      case "Create":
        return "bg-green-100 text-green-800"
      case "Update":
        return "bg-yellow-100 text-yellow-800"
      case "Delete":
        return "bg-red-100 text-red-800"
      case "Approve":
        return "bg-purple-100 text-purple-800"
      case "Export":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    return status === "success" ? "text-green-600" : "text-red-600"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="icon">
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold text-foreground">Audit Logs</h2>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{logs.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{logs.filter((l) => l.status === "success").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{logs.filter((l) => l.status === "failure").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Search by user, action, or resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
          <Button variant="outline">
            <Filter size={18} />
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground">{log.user}</p>
                    <span className={`text-xs px-2 py-1 rounded ${getActionColor(log.action)}`}>{log.action}</span>
                    <span className={`text-xs font-bold ${getStatusColor(log.status)}`}>
                      {log.status === "success" ? "✓" : "✗"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{log.resource}</p>
                  <p className="text-xs text-muted-foreground mb-1">{log.details}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.timestamp} • IP: {log.ipAddress}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
