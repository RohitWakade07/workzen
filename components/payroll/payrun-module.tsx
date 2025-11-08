"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, ChevronRight } from "lucide-react"

interface PayrunModuleProps {
  onBack: () => void
}

interface Payrun {
  id: string
  month: string
  year: number
  status: "draft" | "submitted" | "approved" | "completed"
  startDate: string
  endDate: string
  totalEmployees: number
  totalAmount: number
  createdDate: string
  submittedDate?: string
  approvedDate?: string
}

export default function PayrunModule({ onBack }: PayrunModuleProps) {
  console.log("[v0] PayrunModule: Rendered")

  const [payruns, setPayruns] = useState<Payrun[]>([
    {
      id: "pr_202411",
      month: "November",
      year: 2025,
      status: "submitted",
      startDate: "2025-11-01",
      endDate: "2025-11-30",
      totalEmployees: 156,
      totalAmount: 287500,
      createdDate: "2025-11-01",
      submittedDate: "2025-11-05",
    },
    {
      id: "pr_202410",
      month: "October",
      year: 2025,
      status: "approved",
      startDate: "2025-10-01",
      endDate: "2025-10-31",
      totalEmployees: 156,
      totalAmount: 287500,
      createdDate: "2025-10-01",
      submittedDate: "2025-10-05",
      approvedDate: "2025-10-07",
    },
    {
      id: "pr_202409",
      month: "September",
      year: 2025,
      status: "completed",
      startDate: "2025-09-01",
      endDate: "2025-09-30",
      totalEmployees: 156,
      totalAmount: 287500,
      createdDate: "2025-09-01",
      submittedDate: "2025-09-05",
      approvedDate: "2025-09-07",
    },
  ])

  const [showNewPayrun, setShowNewPayrun] = useState(false)
  const [newPayrunData, setNewPayrunData] = useState({
    month: "",
    year: new Date().getFullYear(),
  })

  const handleCreatePayrun = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] PayrunModule: Creating new payrun", newPayrunData)

    if (!newPayrunData.month) {
      console.log("[v0] PayrunModule: Validation failed - month not selected")
      return
    }

    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]
    const monthIndex = months.indexOf(newPayrunData.month)
    const startDate = new Date(newPayrunData.year, monthIndex, 1)
    const endDate = new Date(newPayrunData.year, monthIndex + 1, 0)

    const newPayrun: Payrun = {
      id: `pr_${newPayrunData.year}${String(monthIndex + 1).padStart(2, "0")}`,
      month: newPayrunData.month,
      year: newPayrunData.year,
      status: "draft",
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      totalEmployees: 156,
      totalAmount: 0,
      createdDate: new Date().toISOString().split("T")[0],
    }

    console.log("[v0] PayrunModule: New payrun created", newPayrun)
    setPayruns([newPayrun, ...payruns])
    setNewPayrunData({ month: "", year: new Date().getFullYear() })
    setShowNewPayrun(false)
  }

  const handleSubmitPayrun = (id: string) => {
    console.log("[v0] PayrunModule: Submitting payrun for approval", id)
    setPayruns(
      payruns.map((pr) =>
        pr.id === id
          ? {
              ...pr,
              status: "submitted" as const,
              submittedDate: new Date().toISOString().split("T")[0],
            }
          : pr,
      ),
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-50 border-gray-200"
      case "submitted":
        return "bg-blue-50 border-blue-200"
      case "approved":
        return "bg-green-50 border-green-200"
      case "completed":
        return "bg-green-50 border-green-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "submitted":
        return "bg-blue-100 text-blue-800"
      case "approved":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="icon">
            <ArrowLeft size={20} />
          </Button>
          <h2 className="text-2xl font-bold text-foreground">Payrun Management</h2>
        </div>
        <Button onClick={() => setShowNewPayrun(!showNewPayrun)} variant="default">
          <Plus size={18} className="mr-2" />
          New Payrun
        </Button>
      </div>

      {/* New Payrun Form */}
      {showNewPayrun && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Create New Payrun</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePayrun} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Month</label>
                  <select
                    value={newPayrunData.month}
                    onChange={(e) => setNewPayrunData({ ...newPayrunData, month: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    required
                  >
                    <option value="">Select Month</option>
                    {months.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Year</label>
                  <Input
                    type="number"
                    value={newPayrunData.year}
                    onChange={(e) => setNewPayrunData({ ...newPayrunData, year: Number.parseInt(e.target.value) })}
                    min={2020}
                    max={2050}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Create Payrun
                </Button>
                <Button type="button" onClick={() => setShowNewPayrun(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Payruns Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft Payruns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{payruns.filter((p) => p.status === "draft").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{payruns.filter((p) => p.status === "submitted").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {payruns.filter((p) => p.status === "completed").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payruns List */}
      <Card>
        <CardHeader>
          <CardTitle>All Payruns ({payruns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {payruns.map((payrun) => (
              <div
                key={payrun.id}
                className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition ${getStatusColor(
                  payrun.status,
                )}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-foreground text-lg">
                      {payrun.month} {payrun.year}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payrun.startDate).toLocaleDateString()} -{" "}
                      {new Date(payrun.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded capitalize ${getStatusBadge(payrun.status)}`}>
                    {payrun.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3 py-3 border-t border-b">
                  <div>
                    <p className="text-xs text-muted-foreground">Employees</p>
                    <p className="font-bold text-foreground">{payrun.totalEmployees}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="font-bold text-foreground">${(payrun.totalAmount / 1000).toFixed(0)}K</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-bold text-foreground">{new Date(payrun.createdDate).toLocaleDateString()}</p>
                  </div>
                </div>

                {payrun.status === "draft" && (
                  <Button size="sm" className="w-full" onClick={() => handleSubmitPayrun(payrun.id)}>
                    Submit for Approval
                    <ChevronRight size={16} className="ml-2" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
