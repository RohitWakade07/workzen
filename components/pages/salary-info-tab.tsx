"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface SalaryComponent {
  id: string
  name: string
  computationType: "fixed" | "percentage"
  value: number // Percentage or fixed amount
  base: "wage" | "basic" // What to calculate from
  description: string
}

const DEFAULT_SALARY_COMPONENTS: SalaryComponent[] = [
  {
    id: "basic",
    name: "Basic Salary",
    computationType: "percentage",
    value: 50.0,
    base: "wage",
    description: "Define Basic salary from company cost compute it based on monthly Wages",
  },
  {
    id: "hra",
    name: "House Rent Allowance (HRA)",
    computationType: "percentage",
    value: 50.0,
    base: "basic",
    description: "HRA provided to employees 50% of the basic salary",
  },
  {
    id: "standard",
    name: "Standard Allowance",
    computationType: "fixed",
    value: 4167.0,
    base: "wage",
    description: "A standard allowance is a predetermined, fixed amount provided to employee as part of their salary",
  },
  {
    id: "performance",
    name: "Performance Bonus",
    computationType: "percentage",
    value: 8.33,
    base: "basic",
    description: "Variable amount paid during payroll. The value defined by the company and calculated as a % of the basic salary",
  },
  {
    id: "lta",
    name: "Leave Travel Allowance (LTA)",
    computationType: "percentage",
    value: 8.33,
    base: "basic",
    description: "LTA is paid by the company to employees to cover their travel expenses. and calculated as a % of the basic salary",
  },
  {
    id: "fixed",
    name: "Fixed Allowance",
    computationType: "fixed",
    value: 0, // Will be calculated as remainder
    base: "wage",
    description: "fixed allowance portion of wages is determined after calculating all salary components",
  },
]

export default function SalaryInfoTab() {
  const { user } = useAuth()
  const isAdminOrPayroll = user?.role === "admin" || user?.role === "payroll_officer"

  const [monthWage, setMonthWage] = useState(50000)
  const [yearlyWage, setYearlyWage] = useState(600000)
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState("")
  const [breakTime, setBreakTime] = useState("")
  const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>(DEFAULT_SALARY_COMPONENTS)
  const [pfRate, setPfRate] = useState(12.0)
  const [professionalTax, setProfessionalTax] = useState(200.0)

  // Track which field was last updated to prevent circular updates
  const [lastUpdated, setLastUpdated] = useState<"month" | "year">("month")

  // Calculate yearly wage from monthly
  useEffect(() => {
    if (lastUpdated === "month") {
      const yearly = monthWage * 12
      setYearlyWage(yearly)
    }
  }, [monthWage, lastUpdated])

  // Calculate monthly wage from yearly
  useEffect(() => {
    if (lastUpdated === "year") {
      const monthly = yearlyWage / 12
      setMonthWage(monthly)
    }
  }, [yearlyWage, lastUpdated])

  // Calculate salary components
  const calculatedComponents = useMemo(() => {
    const results: Record<string, { amount: number; percentage: number }> = {}
    let basicSalary = 0
    let totalCalculated = 0

    // First pass: Calculate Basic Salary
    const basicComponent = salaryComponents.find((c) => c.id === "basic")
    if (basicComponent) {
      if (basicComponent.computationType === "percentage") {
        basicSalary = (monthWage * basicComponent.value) / 100
      } else {
        basicSalary = basicComponent.value
      }
      results.basic = {
        amount: basicSalary,
        percentage: basicComponent.computationType === "percentage" ? basicComponent.value : (basicSalary / monthWage) * 100,
      }
      totalCalculated += basicSalary
    }

    // Second pass: Calculate other components
    salaryComponents.forEach((component) => {
      if (component.id === "basic") return

      let amount = 0
      if (component.id === "fixed") {
        // Fixed allowance is the remainder
        const otherTotal = Object.values(results).reduce((sum, r) => sum + r.amount, 0)
        amount = Math.max(0, monthWage - otherTotal)
      } else if (component.computationType === "percentage") {
        const baseValue = component.base === "basic" ? basicSalary : monthWage
        amount = (baseValue * component.value) / 100
      } else {
        amount = component.value
      }

      results[component.id] = {
        amount,
        percentage: component.computationType === "percentage" ? component.value : (amount / monthWage) * 100,
      }
      totalCalculated += amount
    })

    return { results, basicSalary, totalCalculated }
  }, [monthWage, salaryComponents])

  // Calculate PF
  const pfEmployee = useMemo(() => {
    const basic = calculatedComponents.results.basic?.amount || 0
    return (basic * pfRate) / 100
  }, [calculatedComponents.results.basic?.amount, pfRate])

  const pfEmployer = pfEmployee // Same as employee

  // Calculate total deductions
  const totalDeductions = pfEmployee + professionalTax

  // Calculate net salary
  const grossSalary = calculatedComponents.totalCalculated
  const netSalary = grossSalary - totalDeductions

  // Check if total exceeds wage
  const exceedsWage = calculatedComponents.totalCalculated > monthWage

  if (!isAdminOrPayroll) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Salary Info tab should only be visible to Admin/Payroll Officer</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Salary Info tab should only be visible to Admin/Payroll Officer</AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Salary Info */}
          <Card>
            <CardHeader>
              <CardTitle>Salary Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="monthWage">Month Wage</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="monthWage"
                    type="number"
                    value={monthWage}
                    onChange={(e) => {
                      setLastUpdated("month")
                      setMonthWage(Number(e.target.value))
                    }}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">/ Month</span>
                </div>
              </div>
              <div>
                <Label htmlFor="yearlyWage">Yearly wage</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="yearlyWage"
                    type="number"
                    value={yearlyWage}
                    onChange={(e) => {
                      setLastUpdated("year")
                      setYearlyWage(Number(e.target.value))
                    }}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">/ Yearly</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Working Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Working Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="workingDays">No of working days in a week</Label>
                <Input
                  id="workingDays"
                  type="number"
                  value={workingDaysPerWeek}
                  onChange={(e) => setWorkingDaysPerWeek(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="breakTime">Break Time</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="breakTime"
                    type="number"
                    value={breakTime}
                    onChange={(e) => setBreakTime(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">/hrs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Salary Components */}
          <Card>
            <CardHeader>
              <CardTitle>Salary Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {salaryComponents.map((component) => {
                const calculated = calculatedComponents.results[component.id]
                if (!calculated) return null

                return (
                  <div key={component.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{component.name}</h4>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {calculated.amount.toLocaleString("en-IN", {
                            style: "currency",
                            currency: "INR",
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          / month
                        </div>
                        <div className="text-sm text-muted-foreground">{calculated.percentage.toFixed(2)} %</div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{component.description}</p>
                    <div className="flex gap-2 pt-2">
                      <div className="flex-1">
                        <Label className="text-xs">Computation Type</Label>
                        <Input
                          value={component.computationType === "percentage" ? "Percentage" : "Fixed Amount"}
                          disabled
                          className="mt-1 text-xs"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Value</Label>
                        <Input
                          type="number"
                          value={component.value}
                          onChange={(e) => {
                            const newComponents = salaryComponents.map((c) =>
                              c.id === component.id ? { ...c, value: Number(e.target.value) } : c
                            )
                            setSalaryComponents(newComponents)
                          }}
                          className="mt-1 text-xs"
                          disabled={component.id === "fixed"}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
              {exceedsWage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Total salary components ({calculatedComponents.totalCalculated.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}) exceed the defined wage ({monthWage.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })})
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Provident Fund (PF) Contribution */}
          <Card>
            <CardHeader>
              <CardTitle>Provident Fund (PF) Contribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Employee</h4>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {pfEmployee.toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      / month
                    </div>
                    <div className="text-sm text-muted-foreground">{pfRate.toFixed(2)} %</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">PF is calculated based on the basic salary</p>
              </div>
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Employer</h4>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {pfEmployer.toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      / month
                    </div>
                    <div className="text-sm text-muted-foreground">{pfRate.toFixed(2)} %</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">PF is calculated based on the basic salary</p>
              </div>
              <div>
                <Label htmlFor="pfRate">PF Rate (%)</Label>
                <Input
                  id="pfRate"
                  type="number"
                  value={pfRate}
                  onChange={(e) => setPfRate(Number(e.target.value))}
                  className="mt-1"
                  step="0.01"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tax Deductions */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Deductions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Professional Tax</h4>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {professionalTax.toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      / month
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Professional Tax deducted from the Gross salary</p>
              </div>
              <div>
                <Label htmlFor="professionalTax">Professional Tax Amount</Label>
                <Input
                  id="professionalTax"
                  type="number"
                  value={professionalTax}
                  onChange={(e) => setProfessionalTax(Number(e.target.value))}
                  className="mt-1"
                  step="0.01"
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Salary:</span>
                <span className="font-semibold">
                  {grossSalary.toLocaleString("en-IN", {
                    style: "currency",
                    currency: "INR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Deductions:</span>
                <span className="font-semibold text-destructive">
                  -{totalDeductions.toLocaleString("en-IN", {
                    style: "currency",
                    currency: "INR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-semibold">Net Salary:</span>
                <span className="font-bold text-lg text-primary">
                  {netSalary.toLocaleString("en-IN", {
                    style: "currency",
                    currency: "INR",
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

