"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search } from "lucide-react"

interface TimeOffRecord {
  id: string
  employeeId: string
  employeeName: string
  startDate: string
  endDate: string
  type: "paid" | "sick" | "unpaid"
  status: "pending" | "approved" | "rejected"
  days: number
}

const MOCK_TIMEOFF: TimeOffRecord[] = [
  {
    id: "to_001",
    employeeId: "emp_001",
    employeeName: "John Smith",
    startDate: "2025-01-15",
    endDate: "2025-01-17",
    type: "paid",
    status: "approved",
    days: 3,
  },
  {
    id: "to_002",
    employeeId: "emp_002",
    employeeName: "Sarah Johnson",
    startDate: "2025-01-20",
    endDate: "2025-01-22",
    type: "sick",
    status: "pending",
    days: 3,
  },
  {
    id: "to_003",
    employeeId: "emp_004",
    employeeName: "Emma Davis",
    startDate: "2025-02-01",
    endDate: "2025-02-05",
    type: "paid",
    status: "approved",
    days: 5,
  },
]

interface TimeOffPageProps {
  role: string
}

export default function TimeOffPage({ role }: TimeOffPageProps) {
  const [timeoffs] = useState<TimeOffRecord[]>(MOCK_TIMEOFF)
  const [searchTerm, setSearchTerm] = useState("")

  console.log("[v0] TimeOffPage: Rendered for role", role)

  if (role === "employee") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Time Off</h1>
          <p className="text-muted-foreground mt-1">View and manage your time-off requests</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Paid Time Off Available</p>
            <p className="text-2xl font-bold mt-2">12</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Sick Time Off Available</p>
            <p className="text-2xl font-bold mt-2">8</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Unpaid Days Available</p>
            <p className="text-2xl font-bold mt-2">Unlimited</p>
          </Card>
        </div>

        {/* Request Table */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Your Time-Off Requests</h2>
            <Button>New Request</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeoffs
                .filter((to) => to.employeeId === "emp_001")
                .map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.startDate}</TableCell>
                    <TableCell>{record.endDate}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.type}</Badge>
                    </TableCell>
                    <TableCell>{record.days}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === "approved"
                            ? "default"
                            : record.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    )
  }

  // Admin/Payroll Officer view
  const filteredTimeoffs = timeoffs.filter((to) => to.employeeName.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Time Off Management</h1>
        <p className="text-muted-foreground mt-1">Manage all employee time-off requests</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Paid Time Off Available</p>
          <p className="text-2xl font-bold mt-2">250</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Sick Time Off Available</p>
          <p className="text-2xl font-bold mt-2">160</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pending Approvals</p>
          <p className="text-2xl font-bold mt-2">5</p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <Input
          placeholder="Search employee by name, ID, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Time Off Table */}
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Employee Time-Off Requests</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Name</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTimeoffs.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.employeeName}</TableCell>
                <TableCell>{record.startDate}</TableCell>
                <TableCell>{record.endDate}</TableCell>
                <TableCell>
                  <Badge variant="outline">{record.type}</Badge>
                </TableCell>
                <TableCell>{record.days}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      record.status === "approved"
                        ? "default"
                        : record.status === "pending"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {record.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {record.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive">
                        Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
