"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Eye } from "lucide-react"

interface PayslipModuleProps {
  onBack: () => void
}

interface Payslip {
  id: string
  month: string
  grossSalary: number
  deductions: number
  netSalary: number
  status: "processed" | "pending"
  generatedDate: string
}

export default function PayslipModule({ onBack }: PayslipModuleProps) {
  console.log("[v0] PayslipModule: Rendered")

  const [payslips, setPayslips] = useState<Payslip[]>([
    {
      id: "ps_202411",
      month: "November 2025",
      grossSalary: 4500,
      deductions: 850,
      netSalary: 3650,
      status: "processed",
      generatedDate: "2025-11-01",
    },
    {
      id: "ps_202410",
      month: "October 2025",
      grossSalary: 4500,
      deductions: 850,
      netSalary: 3650,
      status: "processed",
      generatedDate: "2025-10-01",
    },
    {
      id: "ps_202409",
      month: "September 2025",
      grossSalary: 4500,
      deductions: 850,
      netSalary: 3650,
      status: "processed",
      generatedDate: "2025-09-01",
    },
  ])

  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null)

  const handleDownload = (payslip: Payslip) => {
    console.log("[v0] PayslipModule: Downloading payslip", payslip.id)
    console.log("[v0] PayslipModule: File download initiated for", payslip.month)
  }

  if (selectedPayslip) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button onClick={() => setSelectedPayslip(null)} variant="outline" size="icon">
            <ArrowLeft size={20} />
          </Button>
          <h2 className="text-2xl font-bold text-foreground">{selectedPayslip.month}</h2>
        </div>

        {/* Payslip Details */}
        <Card className="border-2">
          <CardHeader className="bg-primary/5">
            <CardTitle>Payslip Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Gross Salary</p>
                <p className="text-3xl font-bold text-foreground">${selectedPayslip.grossSalary.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Deductions</p>
                <p className="text-3xl font-bold text-red-600">${selectedPayslip.deductions.toFixed(2)}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-1">Net Salary</p>
              <p className="text-4xl font-bold text-green-600">${selectedPayslip.netSalary.toFixed(2)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium text-foreground capitalize">{selectedPayslip.status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Generated</p>
                <p className="font-medium text-foreground">
                  {new Date(selectedPayslip.generatedDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            <Button onClick={() => handleDownload(selectedPayslip)} className="w-full mt-4">
              <Download size={18} className="mr-2" />
              Download as PDF
            </Button>
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
        <h2 className="text-2xl font-bold text-foreground">Payslips</h2>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>YTD Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <p className="text-2xl font-bold text-foreground">$13,650</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Deductions</p>
              <p className="text-2xl font-bold text-red-600">$2,550</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">$11,100</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payslips List */}
      <Card>
        <CardHeader>
          <CardTitle>Payslip History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {payslips.map((payslip) => (
              <div
                key={payslip.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition"
              >
                <div>
                  <p className="font-medium text-foreground">{payslip.month}</p>
                  <p className="text-sm text-muted-foreground">
                    Net: ${payslip.netSalary.toFixed(2)} • Generated:{" "}
                    {new Date(payslip.generatedDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setSelectedPayslip(payslip)} size="sm" variant="outline">
                    <Eye size={16} className="mr-1" />
                    View
                  </Button>
                  <Button onClick={() => handleDownload(payslip)} size="sm" variant="outline">
                    <Download size={16} />
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
