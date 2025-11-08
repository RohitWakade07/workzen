"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

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

interface AttendancePageProps {
  role: string
}

export default function AttendancePage({ role }: AttendancePageProps) {
  const { user } = useAuth()
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalDaysPresent: 0,
    pendingApprovals: 0,
    totalWorkHours: 0,
    presentToday: 0,
    absent: 0,
    onLeave: 0,
    halfDay: 0,
  })

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (role === "employee" && user?.employeeId) {
          // Fetch employee's own attendance
          const response = await api.get<{ records: AttendanceRecord[]; stats?: any }>(`/api/attendance/${user.employeeId}`)
          if (response.error) {
            setError(response.error)
          } else if (response.data) {
            setAttendance(response.data.records || [])
            if (response.data.stats) {
              setStats(response.data.stats)
            }
          }
        } else {
          // Fetch all attendance for admin/HR
          const response = await api.get<{ records: AttendanceRecord[]; stats?: any }>("/api/attendance/")
          if (response.error) {
            setError(response.error)
          } else if (response.data) {
            setAttendance(response.data.records || [])
            if (response.data.stats) {
              setStats(response.data.stats)
            }
          }
        }
      } catch (err) {
        console.error("[v0] AttendancePage: Error fetching attendance:", err)
        setError("Failed to load attendance data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAttendance()
  }, [role, user?.employeeId])

  console.log("[v0] AttendancePage: Rendered for role", role)

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
          <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
          <p className="text-muted-foreground mt-1 text-red-500">{error}</p>
        </div>
      </div>
    )
  }

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
            <p className="text-2xl font-bold mt-2">{stats.totalDaysPresent}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Pending Approvals</p>
            <p className="text-2xl font-bold mt-2">{stats.pendingApprovals}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total Work Hours</p>
            <p className="text-2xl font-bold mt-2">{stats.totalWorkHours.toFixed(1)}</p>
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
  if (attendance.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
          <p className="text-muted-foreground mt-1">No attendance records found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
        <p className="text-muted-foreground mt-1">View all employee attendance for today</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Present Today</p>
          <p className="text-2xl font-bold mt-2">{stats.presentToday}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Absent</p>
          <p className="text-2xl font-bold mt-2">{stats.absent}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">On Leave</p>
          <p className="text-2xl font-bold mt-2">{stats.onLeave}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Half Day</p>
          <p className="text-2xl font-bold mt-2">{stats.halfDay}</p>
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
