"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, Trash2, Search, Mail, Phone } from "lucide-react"

interface AddTeamMembersModuleProps {
  onBack: () => void
}

interface TeamMember {
  id: string
  email: string
  name: string
  phone: string
  role: "hr_officer" | "payroll_officer" | "employee"
  department: string
  createdDate: string
  status: "pending" | "active"
}

const ROLE_DESCRIPTIONS = {
  hr_officer: "Manage employees, allocate leave, handle leave requests",
  payroll_officer: "Create payrolls, process approvals, generate reports",
  employee: "View attendance, apply for time off, view payslips",
}

export default function AddTeamMembersModule({ onBack }: AddTeamMembersModuleProps) {
  console.log("[v0] AddTeamMembersModule: Rendered")

  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState("all")

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: "tm_001",
      email: "jane.hr@company.com",
      name: "Jane Smith",
      phone: "+1 (555) 111-1111",
      role: "hr_officer",
      department: "Human Resources",
      createdDate: "2025-11-08",
      status: "active",
    },
    {
      id: "tm_002",
      email: "bob.payroll@company.com",
      name: "Bob Wilson",
      phone: "+1 (555) 222-2222",
      role: "payroll_officer",
      department: "Payroll",
      createdDate: "2025-11-07",
      status: "active",
    },
    {
      id: "tm_003",
      email: "john.doe@company.com",
      name: "John Doe",
      phone: "+1 (555) 333-3333",
      role: "employee",
      department: "Engineering",
      createdDate: "2025-11-06",
      status: "active",
    },
  ])

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    role: "employee" as TeamMember["role"],
    department: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] AddTeamMembersModule: Adding team member", formData.email)

    if (!formData.email || !formData.name || !formData.phone || !formData.department) {
      console.log("[v0] AddTeamMembersModule: Validation failed - missing required fields")
      return
    }

    // Check for duplicate email
    if (teamMembers.some((m) => m.email.toLowerCase() === formData.email.toLowerCase())) {
      console.log("[v0] AddTeamMembersModule: Email already exists")
      return
    }

    const newMember: TeamMember = {
      id: `tm_${Date.now()}`,
      ...formData,
      createdDate: new Date().toISOString().split("T")[0],
      status: "pending",
    }

    console.log("[v0] AddTeamMembersModule: Team member created", newMember)
    setTeamMembers([...teamMembers, newMember])
    setFormData({ email: "", name: "", phone: "", role: "employee", department: "" })
    setShowForm(false)
  }

  const handleDeleteMember = (id: string) => {
    console.log("[v0] AddTeamMembersModule: Deleting team member", id)
    setTeamMembers(teamMembers.filter((m) => m.id !== id))
  }

  const handleResendInvite = (id: string, email: string) => {
    console.log("[v0] AddTeamMembersModule: Resending invite to", email)
    // Mark as active after resend
    setTeamMembers(teamMembers.map((m) => (m.id === id ? { ...m, status: "active" } : m)))
  }

  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch =
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === "all" || member.role === filterRole

    return matchesSearch && matchesRole
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case "hr_officer":
        return "bg-blue-100 text-blue-800"
      case "payroll_officer":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const statsByRole = {
    hr_officer: teamMembers.filter((m) => m.role === "hr_officer").length,
    payroll_officer: teamMembers.filter((m) => m.role === "payroll_officer").length,
    employee: teamMembers.filter((m) => m.role === "employee").length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="icon">
            <ArrowLeft size={20} />
          </Button>
          <h2 className="text-2xl font-bold text-foreground">Add Team Members</h2>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="default">
          <Plus size={18} className="mr-2" />
          Add Member
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">HR Officers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statsByRole.hr_officer}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payroll Officers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statsByRole.payroll_officer}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statsByRole.employee}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Member Form */}
      {showForm && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Add New Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                  <Input
                    type="text"
                    placeholder="Jane Smith"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <Input
                    type="email"
                    placeholder="jane@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
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

              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Role</label>
                <div className="space-y-2">
                  {Object.entries(ROLE_DESCRIPTIONS).map(([roleValue, description]) => (
                    <label
                      key={roleValue}
                      className="flex items-start p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition"
                    >
                      <input
                        type="radio"
                        name="role"
                        value={roleValue}
                        checked={formData.role === roleValue}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as TeamMember["role"] })}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <p className="font-medium text-foreground">{roleValue.replace("_", " ").toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Add Team Member
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
          <option value="hr_officer">HR Officer</option>
          <option value="payroll_officer">Payroll Officer</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({filteredMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredMembers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No team members found. Add one to get started!</p>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">{member.name}</p>
                      <span className={`text-xs px-2 py-1 rounded ${getRoleColor(member.role)}`}>
                        {member.role.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-1">
                      <div className="flex items-center gap-1">
                        <Mail size={14} />
                        {member.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone size={14} />
                        {member.phone}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {member.department} • Added: {member.createdDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(member.status)}`}>
                      {member.status}
                    </span>
                    {member.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResendInvite(member.id, member.email)}
                        className="text-blue-600"
                      >
                        Resend Invite
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteMember(member.id)}
                      className="text-destructive"
                      title="Remove member"
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
