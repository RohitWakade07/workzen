"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, Edit2, Trash2, Search, Shield } from "lucide-react"

interface UserManagementModuleProps {
  onBack: () => void
}

interface SystemUser {
  id: string
  email: string
  name: string
  role: "employee" | "hr_officer" | "payroll_officer" | "admin"
  status: "active" | "inactive" | "suspended"
  department: string
  lastLogin: string
  createdDate: string
}

export default function UserManagementModule({ onBack }: UserManagementModuleProps) {
  console.log("[v0] UserManagementModule: Rendered")

  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState("all")

  const [users, setUsers] = useState<SystemUser[]>([
    {
      id: "usr_001",
      email: "john.doe@company.com",
      name: "John Doe",
      role: "employee",
      status: "active",
      department: "Engineering",
      lastLogin: "2025-11-08 09:30",
      createdDate: "2020-03-15",
    },
    {
      id: "usr_002",
      email: "jane.hr@company.com",
      name: "Jane Smith",
      role: "hr_officer",
      status: "active",
      department: "HR",
      lastLogin: "2025-11-08 08:15",
      createdDate: "2021-06-20",
    },
    {
      id: "usr_003",
      email: "bob.payroll@company.com",
      name: "Bob Wilson",
      role: "payroll_officer",
      status: "active",
      department: "Payroll",
      lastLogin: "2025-11-07 14:20",
      createdDate: "2019-01-10",
    },
    {
      id: "usr_004",
      email: "admin@company.com",
      name: "Admin User",
      role: "admin",
      status: "active",
      department: "Administration",
      lastLogin: "2025-11-08 07:00",
      createdDate: "2018-01-01",
    },
  ])

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    role: "employee" as SystemUser["role"],
    department: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] UserManagementModule: Creating user", formData.email)

    if (!formData.email || !formData.name || !formData.department) {
      console.log("[v0] UserManagementModule: Validation failed - missing required fields")
      return
    }

    const newUser: SystemUser = {
      id: `usr_${Date.now()}`,
      ...formData,
      status: "active",
      lastLogin: new Date().toLocaleString(),
      createdDate: new Date().toISOString().split("T")[0],
    }

    console.log("[v0] UserManagementModule: User created", newUser)
    setUsers([...users, newUser])
    setFormData({ email: "", name: "", role: "employee", department: "" })
    setShowForm(false)
  }

  const handleDeleteUser = (id: string) => {
    console.log("[v0] UserManagementModule: Deleting user", id)
    setUsers(users.filter((u) => u.id !== id))
  }

  const handleSuspendUser = (id: string) => {
    console.log("[v0] UserManagementModule: Suspending user", id)
    setUsers(users.map((u) => (u.id === id ? { ...u, status: "suspended" as const } : u)))
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === "all" || user.role === filterRole

    return matchesSearch && matchesRole
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800"
      case "payroll_officer":
        return "bg-purple-100 text-purple-800"
      case "hr_officer":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "suspended":
        return "bg-red-100 text-red-800"
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
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="default">
          <Plus size={18} className="mr-2" />
          Add User
        </Button>
      </div>

      {/* Add User Form */}
      {showForm && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Add New User</CardTitle>
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
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <Input
                    type="email"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as SystemUser["role"] })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="employee">Employee</option>
                    <option value="hr_officer">HR Officer</option>
                    <option value="payroll_officer">Payroll Officer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Department</label>
                  <Input
                    type="text"
                    placeholder="Engineering"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Create User
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
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="all">All Roles</option>
          <option value="employee">Employee</option>
          <option value="hr_officer">HR Officer</option>
          <option value="payroll_officer">Payroll Officer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground">{user.name}</p>
                    <span className={`text-xs px-2 py-1 rounded ${getRoleColor(user.role)}`}>
                      {user.role.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Department: {user.department} • Last login: {user.lastLogin}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(user.status)}`}>{user.status}</span>
                  <Button size="sm" variant="outline" title="Edit user">
                    <Edit2 size={16} />
                  </Button>
                  {user.status !== "suspended" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSuspendUser(user.id)}
                      className="text-yellow-600"
                      title="Suspend user"
                    >
                      <Shield size={16} />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-destructive"
                    title="Delete user"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
