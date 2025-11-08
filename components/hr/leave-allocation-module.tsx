"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, Save } from "lucide-react"

interface LeaveAllocationModuleProps {
  onBack: () => void
}

interface LeaveAllocation {
  id: string
  employeeId: string
  employeeName: string
  vacationDays: number
  sickDays: number
  personalDays: number
  unpaidDays: number
  year: number
  allocatedDate: string
}

export default function LeaveAllocationModule({ onBack }: LeaveAllocationModuleProps) {
  console.log("[v0] LeaveAllocationModule: Rendered")

  const [showForm, setShowForm] = useState(false)
  const [selectedAllocation, setSelectedAllocation] = useState<LeaveAllocation | null>(null)

  const [allocations, setAllocations] = useState<LeaveAllocation[]>([
    {
      id: "alloc_001",
      employeeId: "EMP001",
      employeeName: "John Doe",
      vacationDays: 20,
      sickDays: 10,
      personalDays: 3,
      unpaidDays: 0,
      year: 2025,
      allocatedDate: "2025-01-01",
    },
    {
      id: "alloc_002",
      employeeId: "EMP002",
      employeeName: "Jane Smith",
      vacationDays: 20,
      sickDays: 10,
      personalDays: 3,
      unpaidDays: 0,
      year: 2025,
      allocatedDate: "2025-01-01",
    },
    {
      id: "alloc_003",
      employeeId: "EMP003",
      employeeName: "Bob Wilson",
      vacationDays: 15,
      sickDays: 8,
      personalDays: 2,
      unpaidDays: 0,
      year: 2025,
      allocatedDate: "2025-01-01",
    },
  ])

  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    vacationDays: 20,
    sickDays: 10,
    personalDays: 3,
    unpaidDays: 0,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] LeaveAllocationModule: Submitting allocation", formData)

    if (!formData.employeeId || !formData.employeeName) {
      console.log("[v0] LeaveAllocationModule: Validation failed - missing employee info")
      return
    }

    const newAllocation: LeaveAllocation = {
      id: `alloc_${Date.now()}`,
      ...formData,
      year: new Date().getFullYear(),
      allocatedDate: new Date().toISOString().split("T")[0],
    }

    console.log("[v0] LeaveAllocationModule: Allocation created", newAllocation)
    setAllocations([...allocations, newAllocation])
    setFormData({
      employeeId: "",
      employeeName: "",
      vacationDays: 20,
      sickDays: 10,
      personalDays: 3,
      unpaidDays: 0,
    })
    setShowForm(false)
  }

  const handleBulkAllocate = () => {
    console.log("[v0] LeaveAllocationModule: Bulk allocation initiated for all employees")
    // Mock implementation
  }

  if (selectedAllocation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button onClick={() => setSelectedAllocation(null)} variant="outline" size="icon">
            <ArrowLeft size={20} />
          </Button>
          <h2 className="text-2xl font-bold text-foreground">Edit Leave Allocation</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{selectedAllocation.employeeName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Vacation Days</label>
                <Input type="number" defaultValue={selectedAllocation.vacationDays} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Sick Days</label>
                <Input type="number" defaultValue={selectedAllocation.sickDays} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Personal Days</label>
                <Input type="number" defaultValue={selectedAllocation.personalDays} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Unpaid Days</label>
                <Input type="number" defaultValue={selectedAllocation.unpaidDays} />
              </div>
            </div>
            <Button className="w-full">
              <Save size={18} className="mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>
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
          <h2 className="text-2xl font-bold text-foreground">Leave Allocation</h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleBulkAllocate} variant="outline">
            Bulk Allocate
          </Button>
          <Button onClick={() => setShowForm(!showForm)} variant="default">
            <Plus size={18} className="mr-2" />
            New Allocation
          </Button>
        </div>
      </div>

      {/* Add Allocation Form */}
      {showForm && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Add Leave Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Employee Name</label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={formData.employeeName}
                    onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Vacation Days</label>
                  <Input
                    type="number"
                    value={formData.vacationDays}
                    onChange={(e) => setFormData({ ...formData, vacationDays: Number.parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Sick Days</label>
                  <Input
                    type="number"
                    value={formData.sickDays}
                    onChange={(e) => setFormData({ ...formData, sickDays: Number.parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Personal Days</label>
                  <Input
                    type="number"
                    value={formData.personalDays}
                    onChange={(e) => setFormData({ ...formData, personalDays: Number.parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Unpaid Days</label>
                  <Input
                    type="number"
                    value={formData.unpaidDays}
                    onChange={(e) => setFormData({ ...formData, unpaidDays: Number.parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Save Allocation
                </Button>
                <Button type="button" onClick={() => setShowForm(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Allocations Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Vacation Days", total: 55 },
          { label: "Total Sick Days", total: 28 },
          { label: "Total Personal Days", total: 8 },
        ].map((item, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{item.total}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Allocations List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Allocations ({allocations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allocations.map((allocation) => (
              <div
                key={allocation.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition"
              >
                <div>
                  <p className="font-medium text-foreground">{allocation.employeeName}</p>
                  <p className="text-sm text-muted-foreground">{allocation.employeeId}</p>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground">Vacation</p>
                    <p className="font-bold text-foreground">{allocation.vacationDays}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Sick</p>
                    <p className="font-bold text-foreground">{allocation.sickDays}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Personal</p>
                    <p className="font-bold text-foreground">{allocation.personalDays}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedAllocation(allocation)}>
                    Edit
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
