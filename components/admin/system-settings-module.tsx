"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Save, AlertCircle } from "lucide-react"

interface SystemSettingsModuleProps {
  onBack: () => void
}

export default function SystemSettingsModule({ onBack }: SystemSettingsModuleProps) {
  console.log("[v0] SystemSettingsModule: Rendered")

  const [settings, setSettings] = useState({
    companyName: "WorkZen Corporation",
    systemEmail: "noreply@workzen.com",
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
    fiscalYearStart: "January",
    leaveYearResetDate: "01-01",
    maxLoginAttempts: 5,
    sessionTimeout: 30,
    backupFrequency: "Daily",
    twoFactorAuth: true,
    ipRestriction: false,
  })

  const [saveMessage, setSaveMessage] = useState("")

  const handleSave = () => {
    console.log("[v0] SystemSettingsModule: Saving system settings", settings)
    setSaveMessage("Settings saved successfully!")
    setTimeout(() => setSaveMessage(""), 3000)
  }

  const handleInputChange = (key: string, value: any) => {
    console.log("[v0] SystemSettingsModule: Updating setting", key, "=", value)
    setSettings({ ...settings, [key]: value })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="icon">
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-bold text-foreground">System Settings</h2>
      </div>

      {saveMessage && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <p className="text-green-800 font-medium">{saveMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Company Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Company Name</label>
            <Input
              type="text"
              value={settings.companyName}
              onChange={(e) => handleInputChange("companyName", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">System Email</label>
            <Input
              type="email"
              value={settings.systemEmail}
              onChange={(e) => handleInputChange("systemEmail", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => handleInputChange("timezone", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="UTC">UTC</option>
                <option value="EST">EST</option>
                <option value="CST">CST</option>
                <option value="MST">MST</option>
                <option value="PST">PST</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Date Format</label>
              <select
                value={settings.dateFormat}
                onChange={(e) => handleInputChange("dateFormat", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Leave & Payroll Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Fiscal Year Start</label>
              <select
                value={settings.fiscalYearStart}
                onChange={(e) => handleInputChange("fiscalYearStart", e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                {[
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
                ].map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Leave Year Reset Date</label>
              <Input
                type="text"
                value={settings.leaveYearResetDate}
                onChange={(e) => handleInputChange("leaveYearResetDate", e.target.value)}
                placeholder="MM-DD"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Max Login Attempts</label>
              <Input
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => handleInputChange("maxLoginAttempts", Number.parseInt(e.target.value))}
                min={1}
                max={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Session Timeout (minutes)</label>
              <Input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleInputChange("sessionTimeout", Number.parseInt(e.target.value))}
                min={5}
                max={480}
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.twoFactorAuth}
                onChange={(e) => handleInputChange("twoFactorAuth", e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-foreground">Require Two-Factor Authentication</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.ipRestriction}
                onChange={(e) => handleInputChange("ipRestriction", e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-foreground">Enable IP Restriction</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Data Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Backup Frequency</label>
            <select
              value={settings.backupFrequency}
              onChange={(e) => handleInputChange("backupFrequency", e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value="Hourly">Hourly</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>
          <Button variant="outline" className="w-full bg-transparent">
            Create Manual Backup
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle size={20} />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">These actions cannot be undone. Please proceed with caution.</p>
          <Button variant="outline" className="w-full text-destructive border-destructive bg-transparent">
            Clear All User Sessions
          </Button>
          <Button variant="outline" className="w-full text-destructive border-destructive bg-transparent">
            Reset System Data
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1">
          <Save size={18} className="mr-2" />
          Save Settings
        </Button>
        <Button onClick={onBack} variant="outline" className="flex-1 bg-transparent">
          Cancel
        </Button>
      </div>
    </div>
  )
}
