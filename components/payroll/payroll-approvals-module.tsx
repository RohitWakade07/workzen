"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Check, X, AlertCircle } from "lucide-react"

interface PayrollApprovalsModuleProps {
  onBack: () => void
}

interface PayrollApproval {
  id: string
  payrunId: string
  month: string
  year: number
  totalAmount: number
  totalEmployees: number
  status: "pending" | "approved" | "rejected"
  submittedBy: string
  submittedDate: string
  requiredApprovals: number
  currentApprovals: number
  approvalNotes?: string
}

export default function PayrollApprovalsModule({ onBack }: PayrollApprovalsModuleProps) {
  console.log("[v0] PayrollApprovalsModule: Rendered")

  const [approvals, setApprovals] = useState<PayrollApproval[]>([
    {
      id: "pa_001",
      payrunId: "pr_202411",
      month: "November",
      year: 2025,
      totalAmount: 287500,
      totalEmployees: 156,
      status: "pending",
      submittedBy: "Payroll Officer",
      submittedDate: "2025-11-05",
      requiredApprovals: 2,
      currentApprovals: 0,
    },
    {
      id: "pa_002",
      payrunId: "pr_202410",
      month: "October",
      year: 2025,
      totalAmount: 287500,
      totalEmployees: 156,
      status: "pending",
      submittedBy: "Payroll Officer",
      submittedDate: "2025-10-05",
      requiredApprovals: 2,
      currentApprovals: 1,
    },
  ])

  const [selectedApproval, setSelectedApproval] = useState<PayrollApproval | null>(null)
  const [approvalNotes, setApprovalNotes] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all")

  const handleApprove = (id: string) => {
    console.log("[v0] PayrollApprovalsModule: Approving payrun", id, "with notes:", approvalNotes)
    setApprovals(
      approvals.map((approval) =>
        approval.id === id
          ? {
              ...approval,
              status: "approved" as const,
              approvalNotes,
              currentApprovals: approval.currentApprovals + 1,
            }
          : approval,
      ),
    )
    setSelectedApproval(null)
    setApprovalNotes("")
  }

  const handleReject = (id: string) => {
    console.log("[v0] PayrollApprovalsModule: Rejecting payrun", id, "with reason:", approvalNotes)
    setApprovals(
      approvals.map((approval) =>
        approval.id === id ? { ...approval, status: "rejected" as const, approvalNotes } : approval,
      ),
    )
    setSelectedApproval(null)
    setApprovalNotes("")
  }

  const filteredApprovals = approvals.filter((approval) =>
    filterStatus === "all" ? true : approval.status === filterStatus,
  )

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

  if (selectedApproval) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button onClick={() => setSelectedApproval(null)} variant="outline" size="icon">
            <ArrowLeft size={20} />
          </Button>
          <h2 className="text-2xl font-bold text-foreground">Review Payroll Approval</h2>
        </div>

        {/* Approval Details */}
        <Card className="border-2">
          <CardHeader className="bg-primary/5">
            <CardTitle>
              {selectedApproval.month} {selectedApproval.year} Payroll
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-bold text-foreground">
                  ${(selectedApproval.totalAmount / 1000).toFixed(0)}K
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employees</p>
                <p className="text-3xl font-bold text-foreground">{selectedApproval.totalEmployees}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y">
              <div>
                <p className="text-sm text-muted-foreground">Submitted By</p>
                <p className="font-medium text-foreground">{selectedApproval.submittedBy}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submitted Date</p>
                <p className="font-medium text-foreground">
                  {new Date(selectedApproval.submittedDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded">
              <p className="text-sm text-muted-foreground mb-1">Approval Progress</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 h-2 rounded overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all"
                    style={{
                      width: `${(selectedApproval.currentApprovals / selectedApproval.requiredApprovals) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-sm font-bold text-foreground">
                  {selectedApproval.currentApprovals}/{selectedApproval.requiredApprovals}
                </p>
              </div>
            </div>

            {selectedApproval.status === "pending" && (
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
                    onClick={() => handleApprove(selectedApproval.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check size={18} className="mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(selectedApproval.id)}
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
        <h2 className="text-2xl font-bold text-foreground">Payroll Approvals (Admin Only)</h2>
      </div>

      {/* Alert */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-900 text-base">
            <AlertCircle size={20} />
            Approval Required by Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 text-sm">
          Note: Final payroll approval is required by administrator. As Payroll Officer, you can view pending approvals
          and track status.
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {approvals.filter((a) => a.status === "pending").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {approvals.filter((a) => a.status === "approved").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{approvals.filter((a) => a.status === "rejected").length}</p>
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

      {/* Approvals List */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Approvals ({filteredApprovals.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredApprovals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No approvals found</p>
            ) : (
              filteredApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition ${getStatusColor(
                    approval.status,
                  )}`}
                  onClick={() => setSelectedApproval(approval)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-foreground">
                        {approval.month} {approval.year} Payroll
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Submitted: {new Date(approval.submittedDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium capitalize ${getStatusBadgeColor(approval.status)}`}
                    >
                      {approval.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-bold text-foreground">${(approval.totalAmount / 1000).toFixed(0)}K</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Employees</p>
                      <p className="font-bold text-foreground">{approval.totalEmployees}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Approvals</p>
                      <p className="font-bold text-foreground">
                        {approval.currentApprovals}/{approval.requiredApprovals}
                      </p>
                    </div>
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
