"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, Edit2, Trash2, Search, Shield, Loader2 } from "lucide-react"
import { api } from "@/lib/api"

interface UserManagementModuleProps {
  onBack: () => void
}

interface SystemUser {
  id: string
  email: string
  name: string
  role: "employee" | "hr_officer" | "payroll_officer" | "admin"
  status: "active" | "inactive" | "suspended"
  department?: string
  lastLogin?: string | null
  createdAt?: string | null
}

interface UserFormState {
  email: string
  name: string
  role: SystemUser["role"]
  department: string
  password: string
  status: SystemUser["status"]
}

const ROLE_OPTIONS: Array<{ label: string; value: SystemUser["role"] }> = [
  { label: "Employee", value: "employee" },
  { label: "HR Officer", value: "hr_officer" },
  { label: "Payroll Officer", value: "payroll_officer" },
  { label: "Admin", value: "admin" },
]

const USER_STATUS_OPTIONS: Array<{ label: string; value: SystemUser["status"] }> = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Suspended", value: "suspended" },
]

const createEmptyUserForm = (): UserFormState => ({
  email: "",
  name: "",
  role: "employee",
  department: "",
  password: "",
  status: "active",
})

const normalizeApiUser = (user: Record<string, any>): SystemUser => {
  const lastLogin = user.lastLogin ?? user.last_login ?? null
  const createdAt = user.createdAt ?? user.created_at ?? null

  return {
    id: user.id,
    email: user.email,
    name: user.name || user.fullName || user.displayName || user.email,
    role: user.role,
    status: user.status ?? "active",
    department: user.department ?? undefined,
    lastLogin: typeof lastLogin === "string" ? lastLogin : lastLogin?.toString?.() ?? null,
    createdAt: typeof createdAt === "string" ? createdAt : createdAt?.toString?.() ?? null,
  }
}

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Never"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export default function UserManagementModule({ onBack }: UserManagementModuleProps) {
  console.log("[v0] UserManagementModule: Rendered")

  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [users, setUsers] = useState<SystemUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await api.get<{ users: Array<Record<string, unknown>> }>("/api/admin/users")
      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        const normalized = (response.data.users || []).map((user) => normalizeApiUser(user))
        setUsers(normalized)
      }
    } catch (err) {
      console.error("[v0] UserManagementModule: Error fetching users:", err)
      setError("Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const [formData, setFormData] = useState<UserFormState>(createEmptyUserForm())
  const isEditing = Boolean(editingUserId)

  const closeForm = () => {
    setFormData(createEmptyUserForm())
    setEditingUserId(null)
    setShowForm(false)
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const trimmedEmail = formData.email.trim().toLowerCase()
    const trimmedName = formData.name.trim()
    const trimmedDepartment = formData.department.trim()
  const trimmedPassword = formData.password.trim()

    if (!trimmedEmail || !trimmedName || !trimmedDepartment) {
      setFormError("Email, name, and department are required.")
      return
    }

    if (isEditing && trimmedPassword && trimmedPassword.length < 6) {
      setFormError("New password must be at least 6 characters long.")
      return
    }

    setIsSubmitting(true)

    try {
      if (isEditing) {
        const updatePayload: Record<string, unknown> = {
          name: trimmedName,
          role: formData.role,
          department: trimmedDepartment,
          status: formData.status,
        }

        if (trimmedPassword) {
          updatePayload.password = trimmedPassword
        }

        const response = await api.put(`/api/admin/users/${editingUserId}`, updatePayload)
        if (response.error) {
          throw new Error(response.error)
        }
      } else {
        const createPayload: Record<string, unknown> = {
          email: trimmedEmail,
          name: trimmedName,
          role: formData.role,
          department: trimmedDepartment,
          status: formData.status,
        }

        const response = await api.post("/api/admin/users", createPayload)
        if (response.error) {
          throw new Error(response.error)
        }
      }

      await fetchUsers()
      closeForm()
    } catch (err) {
      console.error("[v0] UserManagementModule: Error saving user", err)
      setFormError(err instanceof Error ? err.message : "Failed to save user")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    console.log("[v0] UserManagementModule: Deleting user", id)
    try {
      const response = await api.delete(`/api/admin/users/${id}`)
      if (!response.error) {
        setUsers((prev) => prev.filter((u) => u.id !== id))
        if (editingUserId === id) {
          closeForm()
        }
      }
    } catch (err) {
      console.error("[v0] UserManagementModule: Error deleting user:", err)
    }
  }

  const handleSuspendUser = async (id: string) => {
    console.log("[v0] UserManagementModule: Suspending user", id)
    try {
      const response = await api.put(`/api/admin/users/${id}`, { status: "suspended" })
      if (!response.error) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: "suspended" as const } : u)))
      }
    } catch (err) {
      console.error("[v0] UserManagementModule: Error suspending user:", err)
    }
  }

  const handleEditUser = (user: SystemUser) => {
    setError(null)
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department ?? "",
      password: "",
      status: user.status,
    })
    setEditingUserId(user.id)
    setShowForm(true)
    setFormError(null)
  }

  const handleAddUserClick = () => {
    setError(null)

    if (showForm && !editingUserId) {
      closeForm()
      return
    }

    setFormData(createEmptyUserForm())
    setEditingUserId(null)
    setShowForm(true)
    setFormError(null)
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

  const formatStatusLabel = (status: SystemUser["status"]) =>
    status
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
        </div>
        <Button onClick={handleAddUserClick} variant="default">
          <Plus size={18} className="mr-2" />
          Add User
        </Button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Add User Form */}
      {showForm && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>{editingUserId ? "Update User" : "Add New User"}</CardTitle>
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
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <Input
                    type="email"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={!!editingUserId || isSubmitting}
                  />
                  {editingUserId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Email address cannot be changed for existing accounts.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as SystemUser["role"] })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    disabled={isSubmitting}
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
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
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as SystemUser["status"] })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    disabled={isSubmitting}
                  >
                    {USER_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {isEditing ? (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Reset Password</label>
                    <Input
                      type="password"
                      placeholder="Leave blank to keep current password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Provide a new password to reset user credentials.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Initial Password</label>
                    <div className="px-3 py-2 border border-dashed border-border rounded-lg bg-background text-sm text-muted-foreground">
                      Employee ID will be used as the initial password for this account.
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingUserId ? (
                    "Save Changes"
                  ) : (
                    "Create User"
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
            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found</p>
            ) : (
              filteredUsers.map((user) => (
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
                      Department: {user.department || "—"} • Last login: {formatDateTime(user.lastLogin)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(user.status)}`}>
                      {formatStatusLabel(user.status)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      title="Edit user"
                      onClick={() => handleEditUser(user)}
                      disabled={isSubmitting}
                    >
                      <Edit2 size={16} />
                    </Button>
                    {user.status !== "suspended" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSuspendUser(user.id)}
                        className="text-yellow-600"
                        title="Suspend user"
                        disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
