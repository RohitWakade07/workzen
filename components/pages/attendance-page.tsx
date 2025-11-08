"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface AttendanceRecord {
  employeeId: string
  employeeName: string
  checkInTime: string
  checkOutTime: string
  workHours: number
  breakTime: number
  status: "present" | "absent" | "half_day"
  date: string
}

const MOCK_ATTENDANCE: AttendanceRecord[] = [
  {
    employeeId: "emp_001",
    employeeName: "John Smith",
    checkInTime: "09:15 AM",
    checkOutTime: "06:30 PM",
    workHours: 8.75,
    breakTime: 1,
    status: "present",
    date: "2025-01-08",
  },
  {
    employeeId: "emp_002",
    employeeName: "Sarah Johnson",
    checkInTime: "09:00 AM",
    checkOutTime: "05:00 PM",
    workHours: 8,
    breakTime: 1,
    status: "present",
    date: "2025-01-08",
  },
  {
    employeeId: "emp_003",
    employeeName: "Mike Chen",
    checkInTime: "-",
    checkOutTime: "-",
    workHours: 0,
    breakTime: 0,
    status: "absent",
    date: "2025-01-08",
  },
]

interface AttendancePageProps {
  role: string
}

export default function AttendancePage({ role }: AttendancePageProps) {
  const [attendance] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE)

  console.log("[v0] AttendancePage: Rendered for role", role)

  if (role === "employee") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Attendance</h1>
          <p className="text-muted-foreground mt-1">Your attendance records for the current month</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Days Present</p>
            <p className="text-2xl font-bold mt-2">18</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Pending Approvals</p>
            <p className="text-2xl font-bold mt-2">2</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Work Hours</p>
            <p className="text-2xl font-bold mt-2">144.5</p>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Daily Attendance</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Work Hours</TableHead>
                <TableHead>Break Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((record) => (
                <TableRow key={`${record.employeeId}-${record.date}`}>
                  <TableCell>{record.date}</TableCell>
                  <TableCell>{record.checkInTime}</TableCell>
                  <TableCell>{record.checkOutTime}</TableCell>
                  <TableCell>{record.workHours.toFixed(2)}h</TableCell>
                  <TableCell>{record.breakTime}h</TableCell>
                  <TableCell>
                    <Badge variant={record.status === "present" ? "default" : "secondary"}>{record.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    )
  }

  // Admin/HR Officer view
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
        <p className="text-muted-foreground mt-1">View all employee attendance for today</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Present Today</p>
          <p className="text-2xl font-bold mt-2">12</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Absent</p>
          <p className="text-2xl font-bold mt-2">3</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">On Leave</p>
          <p className="text-2xl font-bold mt-2">2</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Half Day</p>
          <p className="text-2xl font-bold mt-2">1</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Today's Attendance - January 8, 2025</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Name</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Work Hours</TableHead>
              <TableHead>Break Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendance.map((record) => (
              <TableRow key={record.employeeId}>
                <TableCell className="font-medium">{record.employeeName}</TableCell>
                <TableCell>{record.checkInTime}</TableCell>
                <TableCell>{record.checkOutTime}</TableCell>
                <TableCell>{record.workHours.toFixed(2)}h</TableCell>
                <TableCell>{record.breakTime}h</TableCell>
                <TableCell>
                  <Badge variant={record.status === "present" ? "default" : "secondary"}>{record.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
