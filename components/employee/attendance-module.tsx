"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle, Clock } from "lucide-react"

interface AttendanceModuleProps {
  onBack: () => void
}

interface AttendanceRecord {
  date: string
  checkIn: string | null
  checkOut: string | null
  status: "present" | "absent" | "half-day" | "pending"
  hoursWorked: number
}

export default function AttendanceModule({ onBack }: AttendanceModuleProps) {
  console.log("[v0] AttendanceModule: Rendered")

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([
    { date: "2025-11-08", checkIn: "09:00", checkOut: "17:30", status: "present", hoursWorked: 8.5 },
    { date: "2025-11-07", checkIn: "09:15", checkOut: "17:45", status: "present", hoursWorked: 8.5 },
    { date: "2025-11-06", checkIn: "09:00", checkOut: "13:00", status: "half-day", hoursWorked: 4 },
    { date: "2025-11-05", checkIn: "08:55", checkOut: "17:30", status: "present", hoursWorked: 8.5 },
    { date: "2025-11-04", checkIn: null, checkOut: null, status: "absent", hoursWorked: 0 },
  ])

  const handleCheckIn = () => {
    const today = new Date().toISOString().split("T")[0]
    console.log("[v0] AttendanceModule: Check-in initiated for", today)

    setAttendance((prev) => {
      const existingRecord = prev.find((r) => r.date === today)
      if (existingRecord && existingRecord.checkIn) {
        console.log("[v0] AttendanceModule: Already checked in today")
        return prev
      }

      const newRecord: AttendanceRecord = {
        date: today,
        checkIn: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        checkOut: null,
        status: "pending",
        hoursWorked: 0,
      }
      console.log("[v0] AttendanceModule: Check-in recorded", newRecord.checkIn)
      return [newRecord, ...prev]
    })
  }

  const handleCheckOut = () => {
    const today = new Date().toISOString().split("T")[0]
    console.log("[v0] AttendanceModule: Check-out initiated for", today)

    setAttendance((prev) =>
      prev.map((record) => {
        if (record.date === today && record.checkIn && !record.checkOut) {
          const checkOut = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
          const [inHour, inMin] = record.checkIn.split(":").map(Number)
          const [outHour, outMin] = checkOut.split(":").map(Number)
          const hoursWorked = outHour - inHour + (outMin - inMin) / 60

          console.log("[v0] AttendanceModule: Check-out recorded", checkOut, "| Hours worked:", hoursWorked.toFixed(2))

          return {
            ...record,
            checkOut,
            status: "present",
            hoursWorked: Math.round(hoursWorked * 100) / 100,
          }
        }
        return record
      }),
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-50 border-green-200"
      case "absent":
        return "bg-red-50 border-red-200"
      case "half-day":
        return "bg-yellow-50 border-yellow-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")
  }

  const today = new Date().toISOString().split("T")[0]
  const todayRecord = attendance.find((r) => r.date === today)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="icon">
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold text-foreground">Attendance Tracking</h2>
      </div>

      {/* Today's Check-in/out */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Today's Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayRecord ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Check-in: <span className="font-mono font-bold text-foreground">{todayRecord.checkIn || "-"}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Check-out: <span className="font-mono font-bold text-foreground">{todayRecord.checkOut || "-"}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Status: <span className="font-bold text-foreground">{getStatusLabel(todayRecord.status)}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No check-in today yet</p>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleCheckIn}
              disabled={todayRecord?.checkIn !== null}
              className="flex-1"
              variant={todayRecord?.checkIn ? "secondary" : "default"}
            >
              <CheckCircle size={18} className="mr-2" />
              {todayRecord?.checkIn ? "Checked In" : "Check In"}
            </Button>
            <Button
              onClick={handleCheckOut}
              disabled={!todayRecord?.checkIn || todayRecord?.checkOut !== null}
              className="flex-1"
              variant={todayRecord?.checkOut ? "secondary" : "default"}
            >
              <Clock size={18} className="mr-2" />
              {todayRecord?.checkOut ? "Checked Out" : "Check Out"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {attendance.map((record, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(record.status)}`}
              >
                <div>
                  <p className="font-medium text-foreground">{new Date(record.date).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">
                    {record.checkIn ? `${record.checkIn} - ${record.checkOut || "pending"}` : "No check-in"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">{getStatusLabel(record.status)}</p>
                  <p className="text-sm text-muted-foreground">{record.hoursWorked} hrs</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
