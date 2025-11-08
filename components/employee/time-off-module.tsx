"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Plus, CheckCircle, AlertCircle, Clock } from "lucide-react"

interface TimeOffModuleProps {
  onBack: () => void
}

interface TimeOffRequest {
  id: string
  type: "vacation" | "sick" | "personal" | "unpaid"
  startDate: string
  endDate: string
  reason: string
  status: "approved" | "pending" | "rejected"
  daysRequested: number
}

export default function TimeOffModule({ onBack }: TimeOffModuleProps) {
  console.log("[v0] TimeOffModule: Rendered")

  const [showForm, setShowForm] = useState(false)
  const [requests, setRequests] = useState<TimeOffRequest[]>([
    {
      id: "toff_001",
      type: "vacation",
      startDate: "2025-11-15",
      endDate: "2025-11-19",
      reason: "Family vacation",
      status: "approved",
      daysRequested: 5,
    },
    {
      id: "toff_002",
      type: "sick",
      startDate: "2025-10-20",
      endDate: "2025-10-21",
      reason: "Medical appointment",
      status: "approved",
      daysRequested: 2,
    },
    {
      id: "toff_003",
      type: "personal",
      startDate: "2025-11-25",
      endDate: "2025-11-25",
      reason: "Personal errand",
      status: "pending",
      daysRequested: 1,
    },
  ])

  const [formData, setFormData] = useState({
    type: "vacation" as TimeOffRequest["type"],
    startDate: "",
    endDate: "",
    reason: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] TimeOffModule: Submitting request", formData)

    if (!formData.startDate || !formData.endDate || !formData.reason) {
      console.log("[v0] TimeOffModule: Form validation failed - missing fields")
      return
    }

    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    const daysRequested = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const newRequest: TimeOffRequest = {
      id: `toff_${Date.now()}`,
      type: formData.type,
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason,
      status: "pending",
      daysRequested,
    }

    console.log("[v0] TimeOffModule: New request created", newRequest)
    setRequests([newRequest, ...requests])
    setFormData({ type: "vacation", startDate: "", endDate: "", reason: "" })
    setShowForm(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle size={18} className="text-green-600" />
      case "rejected":
        return <AlertCircle size={18} className="text-red-600" />
      default:
        return <Clock size={18} className="text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-50 border-green-200"
      case "rejected":
        return "bg-red-50 border-red-200"
      default:
        return "bg-yellow-50 border-yellow-200"
    }
  }

  const balances = {
    vacation: 12,
    sick: 5,
    personal: 3,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="icon">
            <ArrowLeft size={20} />
          </Button>
          <h2 className="text-2xl font-bold text-foreground">Time Off Management</h2>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="default">
          <Plus size={18} className="mr-2" />
          New Request
        </Button>
      </div>

      {/* Leave Balances */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(balances).map(([type, days]) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground capitalize">{type} Leave</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{days}</p>
              <p className="text-xs text-muted-foreground">days available</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Request Form */}
      {showForm && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>New Time Off Request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TimeOffRequest["type"] })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Reason</label>
                <Input
                  type="text"
                  placeholder="Enter reason for time off"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Submit Request
                </Button>
                <Button type="button" onClick={() => setShowForm(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Requests History */}
      <Card>
        <CardHeader>
          <CardTitle>Request History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {requests.map((request) => (
              <div key={request.id} className={`p-4 rounded-lg border ${getStatusColor(request.status)}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <div>
                      <p className="font-medium text-foreground capitalize">{request.type.replace("-", " ")}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(request.startDate).toLocaleDateString()} -{" "}
                        {new Date(request.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-foreground">{request.daysRequested} days</p>
                </div>
                <p className="text-sm text-muted-foreground">{request.reason}</p>
                <p className="text-xs text-muted-foreground mt-2 capitalize">
                  Status: <span className="font-medium">{request.status}</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
