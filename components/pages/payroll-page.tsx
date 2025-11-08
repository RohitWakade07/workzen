"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { Loader2 } from "lucide-react"

interface PayrollRecord {
  employeeId: string
  employeeName: string
  totalWorkingDays: number
  payableDays: number
  unpaidLeaves: number
  netSalary: number
  status: "draft" | "submitted" | "approved" | "processed"
}

export default function PayrollPage() {
  const [payroll, setPayroll] = useState<PayrollRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPayroll = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await api.get<{ records: PayrollRecord[] }>("/api/payroll/records")
        if (response.error) {
          setError(response.error)
        } else if (response.data) {
          setPayroll(response.data.records || [])
        }
      } catch (err) {
        console.error("[v0] PayrollPage: Error fetching payroll:", err)
        setError("Failed to load payroll data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPayroll()
  }, [])

  console.log("[v0] PayrollPage: Rendered with", payroll.length, "records")

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payroll</h1>
          <p className="text-muted-foreground mt-1 text-red-500">{error}</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary"
      case "submitted":
        return "outline"
      case "approved":
        return "default"
      case "processed":
        return "default"
      default:
        return "secondary"
    }
  }

  const totalSalary = payroll.reduce((sum, record) => sum + record.netSalary, 0)
  const processedCount = payroll.filter((r) => r.status === "processed").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payroll</h1>
          <p className="text-muted-foreground mt-1">Manage and process employee salaries</p>
        </div>
        <Button>Generate Payrun</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Employees</p>
          <p className="text-2xl font-bold mt-2">{payroll.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Salary</p>
          <p className="text-2xl font-bold mt-2">₹{totalSalary.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Processed</p>
          <p className="text-2xl font-bold mt-2">{processedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pending Approval</p>
          <p className="text-2xl font-bold mt-2">{payroll.length - processedCount}</p>
        </Card>
      </div>

      {/* Payroll Table */}
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Monthly Payroll - January 2025</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Name</TableHead>
              <TableHead>Total Working Days</TableHead>
              <TableHead>Payable Days</TableHead>
              <TableHead>Unpaid Leaves</TableHead>
              <TableHead>Net Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payroll.map((record) => (
              <TableRow key={record.employeeId}>
                <TableCell className="font-medium">{record.employeeName}</TableCell>
                <TableCell>{record.totalWorkingDays}</TableCell>
                <TableCell>{record.payableDays}</TableCell>
                <TableCell>{record.unpaidLeaves}</TableCell>
                <TableCell className="font-semibold">₹{record.netSalary.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(record.status)}>{record.status}</Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
