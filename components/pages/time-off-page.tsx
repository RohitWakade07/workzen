"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

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

interface TimeOffPageProps {
  role: string
}

export default function TimeOffPage({ role }: TimeOffPageProps) {
  const { user } = useAuth()
  const [timeoffs, setTimeoffs] = useState<TimeOffRecord[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    paidTimeOffAvailable: 0,
    sickTimeOffAvailable: 0,
    unpaidDaysAvailable: "Unlimited",
    totalPaidTimeOff: 0,
    totalSickTimeOff: 0,
    pendingApprovals: 0,
  })

  useEffect(() => {
    const fetchTimeOff = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (role === "employee" && user?.employeeId) {
          // Fetch employee's own time off requests
          const response = await api.get<{ requests: TimeOffRecord[]; stats?: any }>(`/api/leave/requests/${user.employeeId}`)
          if (response.error) {
            setError(response.error)
          } else if (response.data) {
            setTimeoffs(response.data.requests || [])
            if (response.data.stats) {
              setStats(response.data.stats)
            }
          }
        } else {
          // Fetch all time off requests for admin/HR
          const response = await api.get<{ requests: TimeOffRecord[]; stats?: any }>("/api/leave/requests")
          if (response.error) {
            setError(response.error)
          } else if (response.data) {
            setTimeoffs(response.data.requests || [])
            if (response.data.stats) {
              setStats(response.data.stats)
            }
          }
        }
      } catch (err) {
        console.error("[v0] TimeOffPage: Error fetching time off:", err)
        setError("Failed to load time off data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTimeOff()
  }, [role, user?.employeeId])

  console.log("[v0] TimeOffPage: Rendered for role", role)

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
          <h1 className="text-3xl font-bold text-foreground">Time Off</h1>
          <p className="text-muted-foreground mt-1 text-red-500">{error}</p>
        </div>
      </div>
    )
  }

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
            <p className="text-2xl font-bold mt-2">{stats.paidTimeOffAvailable}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Sick Time Off Available</p>
            <p className="text-2xl font-bold mt-2">{stats.sickTimeOffAvailable}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Unpaid Days Available</p>
            <p className="text-2xl font-bold mt-2">{stats.unpaidDaysAvailable}</p>
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
                .filter((to) => to.employeeId === user?.employeeId)
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
          <p className="text-2xl font-bold mt-2">{stats.totalPaidTimeOff}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Sick Time Off Available</p>
          <p className="text-2xl font-bold mt-2">{stats.totalSickTimeOff}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pending Approvals</p>
          <p className="text-2xl font-bold mt-2">{stats.pendingApprovals}</p>
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
