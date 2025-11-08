"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, UserPlus, Plane, AlertCircle, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Employee {
  id: string
  employee_id?: string
  first_name?: string
  last_name?: string
  name?: string
  email: string
  department: string
  position?: string
  status: "active" | "inactive" | "present" | "absent" | "on_leave"
  checkInTime?: string
  avatar?: string
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch employees from API
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setIsLoading(true)
        setError(null)
        console.log("[v0] EmployeesPage: Fetching employees from API")
        
        const response = await api.get<any[]>("/api/employees/")
        
        if (response.error) {
          setError(response.error)
          console.error("[v0] EmployeesPage: Error fetching employees:", response.error)
        } else if (response.data) {
          // Transform backend data to frontend format
          const transformedEmployees = response.data.map((emp: any) => ({
            id: emp.id || emp.employee_id,
            employee_id: emp.employee_id,
            name: emp.first_name && emp.last_name 
              ? `${emp.first_name} ${emp.last_name}` 
              : emp.name || emp.email?.split("@")[0] || "Unknown",
            email: emp.email,
            department: emp.department || "Unknown",
            position: emp.position || "Employee",
            status: emp.status === "active" ? "present" : emp.status === "inactive" ? "absent" : "on_leave",
            avatar: emp.first_name && emp.last_name
              ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase()
              : emp.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "??",
            checkInTime: undefined, // Will be populated from attendance data if available
          }))
          
          setEmployees(transformedEmployees)
          console.log(`[v0] EmployeesPage: Loaded ${transformedEmployees.length} employees`)
        }
      } catch (err) {
        console.error("[v0] EmployeesPage: Error fetching employees:", err)
        setError("Failed to load employees")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmployees()
  }, [])

  console.log("[v0] EmployeesPage: Rendered with", employees.length, "employees")

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case "present":
        return <div className="w-3 h-3 rounded-full bg-green-500" title="Present" />
      case "on_leave":
        return <Plane className="w-3 h-3 text-blue-500" title="On Leave" />
      case "absent":
        return <div className="w-3 h-3 rounded-full bg-yellow-500" title="Absent" />
      default:
        return <div className="w-3 h-3 rounded-full bg-slate-400" title="Unknown" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading employees...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employees</h1>
          <p className="text-muted-foreground mt-1">Manage all employees and view their status</p>
        </div>
        <Button className="gap-2">
          <UserPlus size={20} />
          Add Employee
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <Input
          placeholder="Search by name, email, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer relative">
            {/* Status indicator - top right */}
            <div className="absolute top-4 right-4 flex items-center justify-center">
              {getStatusIndicator(employee.status)}
            </div>

            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">{employee.avatar || "??"}</span>
            </div>

            {/* Employee Details */}
            <div className="text-center space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">{employee.name}</h3>
                <p className="text-xs text-muted-foreground">{employee.email}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{employee.position}</p>
                <Badge variant="secondary" className="text-xs">
                  {employee.department}
                </Badge>
              </div>

              {employee.checkInTime && (
                <p className="text-xs text-green-600 font-medium">Checked in: {employee.checkInTime}</p>
              )}

              {employee.status === "on_leave" && <p className="text-xs text-blue-600 font-medium">On Leave</p>}

              {employee.status === "absent" && (
                <div className="flex items-center justify-center gap-1 text-xs text-yellow-600">
                  <AlertCircle size={12} />
                  Not Checked In
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No employees found matching your search</p>
        </div>
      )}
    </div>
  )
}
