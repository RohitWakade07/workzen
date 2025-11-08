"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, UserPlus, Plane, AlertCircle } from "lucide-react"

interface Employee {
  id: string
  name: string
  email: string
  department: string
  position: string
  avatar: string
  status: "present" | "absent" | "on_leave"
  checkInTime?: string
}

const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "emp_001",
    name: "John Smith",
    email: "john@example.com",
    department: "Engineering",
    position: "Senior Developer",
    avatar: "JS",
    status: "present",
    checkInTime: "09:15 AM",
  },
  {
    id: "emp_002",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    department: "HR",
    position: "HR Manager",
    avatar: "SJ",
    status: "on_leave",
  },
  {
    id: "emp_003",
    name: "Mike Chen",
    email: "mike@example.com",
    department: "Finance",
    position: "Accountant",
    avatar: "MC",
    status: "absent",
  },
  {
    id: "emp_004",
    name: "Emma Davis",
    email: "emma@example.com",
    department: "Engineering",
    position: "Frontend Developer",
    avatar: "ED",
    status: "present",
    checkInTime: "08:45 AM",
  },
  {
    id: "emp_005",
    name: "Alex Rodriguez",
    email: "alex@example.com",
    department: "Sales",
    position: "Sales Manager",
    avatar: "AR",
    status: "present",
    checkInTime: "09:00 AM",
  },
  {
    id: "emp_006",
    name: "Lisa Wong",
    email: "lisa@example.com",
    department: "Marketing",
    position: "Marketing Lead",
    avatar: "LW",
    status: "on_leave",
  },
]

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES)
  const [searchTerm, setSearchTerm] = useState("")

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
          <Card key={employee.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
            {/* Status indicator - top right */}
            <div className="absolute top-4 right-4 flex items-center justify-center">
              {getStatusIndicator(employee.status)}
            </div>

            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">{employee.avatar}</span>
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
