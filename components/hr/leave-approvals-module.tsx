"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Check, X } from "lucide-react"

interface LeaveApprovalsModuleProps {
  onBack: () => void
}

interface LeaveRequest {
  id: string
  employeeName: string
  employeeId: string
  type: string
  startDate: string
  endDate: string
  reason: string
  daysRequested: number
  status: "pending" | "approved" | "rejected"
  submittedDate: string
  approvalNotes?: string
}

export default function LeaveApprovalsModule({ onBack }: LeaveApprovalsModuleProps) {
  console.log("[v0] LeaveApprovalsModule: Rendered")

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
    {
      id: "lr_001",
      employeeName: "John Doe",
      employeeId: "EMP001",
      type: "Vacation",
      startDate: "2025-11-15",
      endDate: "2025-11-19",
      reason: "Family vacation",
      daysRequested: 5,
      status: "pending",
      submittedDate: "2025-11-05",
    },
    {
      id: "lr_002",
      employeeName: "Jane Smith",
      employeeId: "EMP002",
      type: "Sick Leave",
      startDate: "2025-11-10",
      endDate: "2025-11-10",
      reason: "Medical appointment",
      daysRequested: 1,
      status: "pending",
      submittedDate: "2025-11-08",
    },
    {
      id: "lr_003",
      employeeName: "Bob Wilson",
      employeeId: "EMP003",
      type: "Personal",
      startDate: "2025-10-15",
      endDate: "2025-10-15",
      reason: "Personal errand",
      daysRequested: 1,
      status: "approved",
      submittedDate: "2025-10-10",
      approvalNotes: "Approved by HR",
    },
  ])

  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [approvalNotes, setApprovalNotes] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all")

  const handleApprove = (id: string) => {
    console.log("[v0] LeaveApprovalsModule: Approving request", id, "with notes:", approvalNotes)
    setLeaveRequests(
      leaveRequests.map((req) => (req.id === id ? { ...req, status: "approved" as const, approvalNotes } : req)),
    )
    setSelectedRequest(null)
    setApprovalNotes("")
  }

  const handleReject = (id: string) => {
    console.log("[v0] LeaveApprovalsModule: Rejecting request", id, "with reason:", approvalNotes)
    setLeaveRequests(
      leaveRequests.map((req) => (req.id === id ? { ...req, status: "rejected" as const, approvalNotes } : req)),
    )
    setSelectedRequest(null)
    setApprovalNotes("")
  }

  const filteredRequests = leaveRequests.filter((req) => (filterStatus === "all" ? true : req.status === filterStatus))

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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  if (selectedRequest) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button onClick={() => setSelectedRequest(null)} variant="outline" size="icon">
            <ArrowLeft size={20} />
          </Button>
          <h2 className="text-2xl font-bold text-foreground">Review Leave Request</h2>
        </div>

        {/* Request Details */}
        <Card className="border-2">
          <CardHeader className="bg-primary/5">
            <CardTitle>{selectedRequest.employeeName}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Employee ID</p>
                <p className="font-medium text-foreground">{selectedRequest.employeeId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Leave Type</p>
                <p className="font-medium text-foreground">{selectedRequest.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium text-foreground">
                  {new Date(selectedRequest.startDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium text-foreground">{new Date(selectedRequest.endDate).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Days Requested</p>
              <p className="text-3xl font-bold text-foreground">{selectedRequest.daysRequested}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Reason</p>
              <p className="text-foreground">{selectedRequest.reason}</p>
            </div>

            {selectedRequest.status !== "pending" && (
              <div className="bg-muted p-3 rounded">
                <p className="text-sm text-muted-foreground">Approval Notes</p>
                <p className="text-foreground">{selectedRequest.approvalNotes}</p>
              </div>
            )}

            {selectedRequest.status === "pending" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Approval Notes</label>
                  <Input
                    type="text"
                    placeholder="Add notes for approval/rejection..."
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(selectedRequest.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check size={18} className="mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(selectedRequest.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    <X size={18} className="mr-2" />
                    Reject
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="icon">
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold text-foreground">Leave Request Approvals</h2>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {leaveRequests.filter((r) => r.status === "pending").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {leaveRequests.filter((r) => r.status === "approved").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {leaveRequests.filter((r) => r.status === "rejected").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((status) => (
          <Button
            key={status}
            onClick={() => setFilterStatus(status)}
            variant={filterStatus === status ? "default" : "outline"}
            className="capitalize"
          >
            {status === "all" ? "All" : status}
          </Button>
        ))}
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No requests found</p>
            ) : (
              filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition ${getStatusColor(
                    request.status,
                  )}`}
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground">{request.employeeName}</p>
                      <p className="text-sm text-muted-foreground">{request.employeeId}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium capitalize ${getStatusBadgeColor(request.status)}`}
                    >
                      {request.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                    <div>
                      <p className="text-muted-foreground">{request.type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {new Date(request.startDate).toLocaleDateString()} -{" "}
                        {new Date(request.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{request.daysRequested} days</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">{request.reason}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
