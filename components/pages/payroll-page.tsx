"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface PayrollRecord {
  employeeId: string
  employeeName: string
  totalWorkingDays: number
  payableDays: number
  unpaidLeaves: number
  netSalary: number
  status: "draft" | "submitted" | "approved" | "processed"
}

const MOCK_PAYROLL: PayrollRecord[] = [
  {
    employeeId: "emp_001",
    employeeName: "John Smith",
    totalWorkingDays: 22,
    payableDays: 21,
    unpaidLeaves: 1,
    netSalary: 4500,
    status: "approved",
  },
  {
    employeeId: "emp_002",
    employeeName: "Sarah Johnson",
    totalWorkingDays: 22,
    payableDays: 22,
    unpaidLeaves: 0,
    netSalary: 5200,
    status: "processed",
  },
  {
    employeeId: "emp_004",
    employeeName: "Emma Davis",
    totalWorkingDays: 22,
    payableDays: 20,
    unpaidLeaves: 2,
    netSalary: 3800,
    status: "submitted",
  },
]

export default function PayrollPage() {
  const [payroll] = useState<PayrollRecord[]>(MOCK_PAYROLL)

  console.log("[v0] PayrollPage: Rendered with", payroll.length, "records")

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
