"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, Edit2, Trash2, Search, Phone, Mail, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

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

interface EmployeeFormState {
  name: string
  email: string
  phone: string
  department: string
  position: string
  employeeId: string
  status: Employee["status"]
}

const STATUS_OPTIONS: Array<{ label: string; value: Employee["status"] }> = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "On Leave", value: "on-leave" },
]

const DEFAULT_DEPARTMENTS = ["General", "Engineering", "Marketing", "Sales", "HR", "Finance", "Operations", "Support"]

const mapApiEmployee = (emp: any): Employee => ({
  id: emp.id || emp.employee_id,
  name:
    emp.first_name && emp.last_name
      ? `${emp.first_name} ${emp.last_name}`
      : emp.name || "Unknown",
  email: emp.email,
  phone: emp.phone || "",
  department: emp.department || "Unknown",
  position: emp.position || "Employee",
  employeeId: emp.employee_id,
  joinDate: emp.date_of_joining || new Date().toISOString().split("T")[0],
  status: emp.status === "inactive" ? "inactive" : emp.status === "on-leave" ? "on-leave" : "active",
})

const createEmptyFormState = (): EmployeeFormState => ({
  name: "",
  email: "",
  phone: "",
  department: "",
  position: "",
  employeeId: "",
  status: "active",
})

export default function EmployeeManagementModule({ onBack }: EmployeeManagementModuleProps) {
  console.log("[v0] EmployeeManagementModule: Rendered")

  const { user } = useAuth()
  const canAddEmployee = !!user && (user.role === "admin" || user.role === "hr_officer")

  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterDept, setFilterDept] = useState("all")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get<any[]>("/api/employees/")
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        setEmployees(response.data.map(mapApiEmployee))
      }
    } catch (err) {
      console.error("[v0] EmployeeManagementModule: Error fetching employees:", err)
      setError("Failed to load employees")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const [formData, setFormData] = useState<EmployeeFormState>(createEmptyFormState())

  const closeForm = () => {
    setFormData(createEmptyFormState())
    setEditingEmployeeId(null)
    setShowForm(false)
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const trimmedName = formData.name.trim()
    const trimmedEmail = formData.email.trim()
    const trimmedDepartment = formData.department.trim()
    const trimmedPosition = formData.position.trim()
    const trimmedEmployeeId = formData.employeeId.trim()
    const isEditing = Boolean(editingEmployeeId)

    if (!trimmedName || !trimmedEmail || !trimmedDepartment || !trimmedPosition || !trimmedEmployeeId) {
      setFormError("Please fill all required fields before submitting.")
      return
    }

    const [firstName, ...lastNameParts] = trimmedName.split(/\s+/)
    const lastName = lastNameParts.length > 0 ? lastNameParts.join(" ") : firstName

    setIsSubmitting(true)

    try {
      if (editingEmployeeId) {
        const updatePayload = {
          first_name: firstName,
          last_name: lastName,
          email: trimmedEmail,
          phone: formData.phone.trim() || null,
          department: trimmedDepartment,
          position: trimmedPosition,
          status: formData.status,
        }

        const response = await api.put(`/api/employees/${editingEmployeeId}`, updatePayload)
        if (response.error) {
          throw new Error(response.error)
        }
      } else {
        const createPayload = {
          first_name: firstName,
          last_name: lastName,
          email: trimmedEmail,
          phone: formData.phone.trim() || null,
          department: trimmedDepartment,
          position: trimmedPosition,
          employee_id: trimmedEmployeeId,
          status: formData.status,
        }

        const response = await api.post("/api/employees/", createPayload)
        if (response.error) {
          throw new Error(response.error)
        }
      }

      await fetchEmployees()
      closeForm()
    } catch (err) {
      console.error("[v0] EmployeeManagementModule: Error saving employee", err)
      setFormError(err instanceof Error ? err.message : "Failed to save employee")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (employee: Employee) => {
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department === "Unknown" ? "" : employee.department,
      position: employee.position,
      employeeId: employee.employeeId,
      status: employee.status,
    })
    setEditingEmployeeId(employee.id)
    setShowForm(true)
    setFormError(null)
  }

  const handleAddEmployeeClick = () => {
    if (!canAddEmployee) {
      return
    }

    if (showForm && !editingEmployeeId) {
      closeForm()
      return
    }

    setFormData(createEmptyFormState())
    setEditingEmployeeId(null)
    setShowForm(true)
    setFormError(null)
  }

  const handleDelete = async (id: string) => {
    console.log("[v0] EmployeeManagementModule: Deleting employee", id)
    try {
      const response = await api.delete(`/api/employees/${id}`)
      if (!response.error) {
        setEmployees((prev) => prev.filter((e) => e.id !== id))
        if (editingEmployeeId === id) {
          closeForm()
        }
      }
    } catch (err) {
      console.error("[v0] EmployeeManagementModule: Error deleting employee:", err)
    }
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
  const departmentOptions = Array.from(
    new Set(
      [...DEFAULT_DEPARTMENTS, ...departments, formData.department]
        .filter((dept) => dept && dept !== "Unknown")
        .map((dept) => dept)
    )
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "inactive":
        return "bg-red-100 text-red-800"
      case "on-leave":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatStatusLabel = (status: Employee["status"]) =>
    status
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")

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
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="icon">
            <ArrowLeft size={20} />
          </Button>
          <h2 className="text-2xl font-bold text-foreground">Employee Management</h2>
        </div>
        <p className="text-red-500">{error}</p>
      </div>
    )
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
        <Button
          onClick={handleAddEmployeeClick}
          variant="default"
          disabled={!canAddEmployee}
          title={!canAddEmployee ? "Only Admin or HR can add employees" : undefined}
        >
          <Plus size={18} className="mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Add Employee Form */}
      {showForm && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>{editingEmployeeId ? "Update Employee" : "Add New Employee"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isSubmitting}
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
                    disabled={!!editingEmployeeId || isSubmitting}
                  />
                  {editingEmployeeId && (
                    <p className="text-xs text-muted-foreground mt-1">Employee ID cannot be changed for existing records.</p>
                  )}
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
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                  <Input
                    type="tel"
                    placeholder="555-0101"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                  >
                    <option value="">Select Department</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
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
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Employment Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as Employee["status"] })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    disabled={isSubmitting}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingEmployeeId ? (
                    "Save Changes"
                  ) : (
                    "Add Employee"
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={closeForm}
                  variant="outline"
                  className="flex-1"
                  disabled={isSubmitting}
                >
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
                        {formatStatusLabel(employee.status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(employee)}
                      disabled={!canAddEmployee}
                      title={!canAddEmployee ? "Only Admin or HR can edit employees" : undefined}
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(employee.id)}
                      className="text-destructive"
                      disabled={!canAddEmployee}
                      title={!canAddEmployee ? "Only Admin or HR can delete employees" : undefined}
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
