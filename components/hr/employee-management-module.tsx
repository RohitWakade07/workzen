"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, Edit2, Trash2, Search, Phone, Mail } from "lucide-react"

interface EmployeeManagementModuleProps {
  onBack: () => void
}

interface Employee {
  id: string
  name: string
  email: string
  phone: string
  department: string
  position: string
  employeeId: string
  joinDate: string
  status: "active" | "inactive" | "on-leave"
}

export default function EmployeeManagementModule({ onBack }: EmployeeManagementModuleProps) {
  console.log("[v0] EmployeeManagementModule: Rendered")

  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDept, setFilterDept] = useState("all")

  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: "emp_001",
      name: "John Doe",
      email: "john.doe@company.com",
      phone: "555-0101",
      department: "Engineering",
      position: "Senior Developer",
      employeeId: "EMP001",
      joinDate: "2020-03-15",
      status: "active",
    },
    {
      id: "emp_002",
      name: "Jane Smith",
      email: "jane.smith@company.com",
      phone: "555-0102",
      department: "Marketing",
      position: "Marketing Manager",
      employeeId: "EMP002",
      joinDate: "2021-06-20",
      status: "active",
    },
    {
      id: "emp_003",
      name: "Bob Wilson",
      email: "bob.wilson@company.com",
      phone: "555-0103",
      department: "Sales",
      position: "Sales Representative",
      employeeId: "EMP003",
      joinDate: "2019-01-10",
      status: "on-leave",
    },
  ])

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    employeeId: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] EmployeeManagementModule: Submitting new employee", formData)

    if (!formData.name || !formData.email || !formData.department || !formData.position || !formData.employeeId) {
      console.log("[v0] EmployeeManagementModule: Form validation failed - missing required fields")
      return
    }

    const newEmployee: Employee = {
      id: `emp_${Date.now()}`,
      ...formData,
      phone: formData.phone || "",
      joinDate: new Date().toISOString().split("T")[0],
      status: "active",
    }

    console.log("[v0] EmployeeManagementModule: Employee created", newEmployee)
    setEmployees([...employees, newEmployee])
    setFormData({ name: "", email: "", phone: "", department: "", position: "", employeeId: "" })
    setShowForm(false)
  }

  const handleDelete = (id: string) => {
    console.log("[v0] EmployeeManagementModule: Deleting employee", id)
    setEmployees(employees.filter((e) => e.id !== id))
  }

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId.includes(searchQuery)
    const matchesDept = filterDept === "all" || emp.department === filterDept

    return matchesSearch && matchesDept
  })

  const departments = Array.from(new Set(employees.map((e) => e.department)))

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "on-leave":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="icon">
            <ArrowLeft size={20} />
          </Button>
          <h2 className="text-2xl font-bold text-foreground">Employee Management</h2>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="default">
          <Plus size={18} className="mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Add Employee Form */}
      {showForm && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Add New Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Employee ID</label>
                  <Input
                    type="text"
                    placeholder="EMP001"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <Input
                    type="email"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                  <Input
                    type="tel"
                    placeholder="555-0101"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Position</label>
                  <Input
                    type="text"
                    placeholder="Senior Developer"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Add Employee
                </Button>
                <Button type="button" onClick={() => setShowForm(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Search by name, email, or employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employees ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredEmployees.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No employees found</p>
            ) : (
              filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{employee.name}</p>
                    <p className="text-sm text-muted-foreground">{employee.employeeId}</p>
                    <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail size={14} /> {employee.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone size={14} /> {employee.phone}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-muted px-2 py-1 rounded">{employee.department}</span>
                      <span className="text-xs bg-muted px-2 py-1 rounded">{employee.position}</span>
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(employee.status)}`}>
                        {employee.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(employee.id)}
                      className="text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
