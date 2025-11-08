"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Pencil, Plus, Save, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api } from "@/lib/api"
import SalaryInfoTab from "./salary-info-tab"

interface ProfileData {
  name: string
  loginId: string
  email: string
  mobile: string
  company: string
  department: string
  manager: string
  location: string
  about: string
  jobLove: string
  interests: string
  skills: string[]
  certifications: string[]
  dateOfBirth: string
  residingAddress: string
  nationality: string
  personalEmail: string
  gender: string
  maritalStatus: string
  dateOfJoining: string
  accountNumber: string
  bankName: string
  ifscCode: string
  panNo: string
  uanNo: string
  empCode: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("resume")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Profile data state
  const [profileData, setProfileData] = useState<ProfileData>({
    name: user?.name || "",
    loginId: user?.email || "",
    email: user?.email || "",
    mobile: user?.phone || "",
    company: user?.companyName || "",
    department: user?.department || "",
    manager: "",
    location: "",
    about: "",
    jobLove: "",
    interests: "",
    skills: [],
    certifications: [],
    dateOfBirth: "",
    residingAddress: "",
    nationality: "",
    personalEmail: "",
    gender: "",
    maritalStatus: "",
    dateOfJoining: "",
    accountNumber: "",
    bankName: "",
    ifscCode: "",
    panNo: "",
    uanNo: "",
    empCode: user?.employeeId || user?.id || "",
  })

  // Get employee ID - use employeeId if available, otherwise use user id
  const employeeId = user?.employeeId || user?.id || ""

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!employeeId) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const response = await api.get<any>(`/api/employees/${employeeId}/profile`)

        if (response.error) {
          setError(response.error)
          // Initialize with user data if API fails
          setProfileData((prev) => ({
            ...prev,
            name: user?.name || "",
            email: user?.email || "",
            loginId: user?.email || "",
            mobile: user?.phone || "",
            company: user?.companyName || "",
            department: user?.department || "",
            empCode: user?.employeeId || user?.id || "",
          }))
        } else if (response.data) {
          const data = response.data
          setProfileData({
            name: data.name || user?.name || "",
            loginId: data.email || user?.email || "",
            email: data.email || user?.email || "",
            mobile: data.mobile || user?.phone || "",
            company: data.company || user?.companyName || "",
            department: data.department || user?.department || "",
            manager: data.manager || "",
            location: data.location || "",
            about: data.about || data.job_love || "",
            jobLove: data.job_love || "",
            interests: data.interests || "",
            skills: data.skills || [],
            certifications: data.certifications || [],
            dateOfBirth: data.date_of_birth || "",
            residingAddress: data.residing_address || "",
            nationality: data.nationality || "",
            personalEmail: data.personal_email || "",
            gender: data.gender || "",
            maritalStatus: data.marital_status || "",
            dateOfJoining: data.date_of_joining || "",
            accountNumber: data.account_number || "",
            bankName: data.bank_name || "",
            ifscCode: data.ifsc_code || "",
            panNo: data.pan_no || "",
            uanNo: data.uan_no || "",
            empCode: data.emp_code || user?.employeeId || user?.id || "",
          })
        }
      } catch (err) {
        console.error("[Profile] Error fetching profile:", err)
        setError("Failed to load profile data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [employeeId, user])

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }))
    setSuccessMessage(null)
    setError(null)
  }

  const handleAddSkill = () => {
    const skill = prompt("Enter skill name:")
    if (skill && skill.trim()) {
      setProfileData((prev) => ({
        ...prev,
        skills: [...prev.skills, skill.trim()],
      }))
    }
  }

  const handleRemoveSkill = (index: number) => {
    setProfileData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }))
  }

  const handleAddCertification = () => {
    const cert = prompt("Enter certification name:")
    if (cert && cert.trim()) {
      setProfileData((prev) => ({
        ...prev,
        certifications: [...prev.certifications, cert.trim()],
      }))
    }
  }

  const handleRemoveCertification = (index: number) => {
    setProfileData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }))
  }

  const handleSaveProfile = async () => {
    if (!employeeId) {
      setError("Employee ID is required")
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      const payload = {
        name: profileData.name,
        email: profileData.email,
        mobile: profileData.mobile,
        company: profileData.company,
        department: profileData.department,
        manager: profileData.manager,
        location: profileData.location,
        about: profileData.about,
        job_love: profileData.jobLove,
        interests: profileData.interests,
        skills: profileData.skills,
        certifications: profileData.certifications,
        date_of_birth: profileData.dateOfBirth,
        residing_address: profileData.residingAddress,
        nationality: profileData.nationality,
        personal_email: profileData.personalEmail,
        gender: profileData.gender,
        marital_status: profileData.maritalStatus,
        date_of_joining: profileData.dateOfJoining,
        account_number: profileData.accountNumber,
        bank_name: profileData.bankName,
        ifsc_code: profileData.ifscCode,
        pan_no: profileData.panNo,
        uan_no: profileData.uanNo,
        emp_code: profileData.empCode,
      }

      const response = await api.put(`/api/employees/${employeeId}/profile`, payload)

      if (response.error) {
        setError(response.error)
      } else {
        setSuccessMessage("Profile updated successfully!")
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (err) {
      console.error("[Profile] Error saving profile:", err)
      setError("Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
        <Button onClick={handleSaveProfile} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="private-info">Private Info</TabsTrigger>
          <TabsTrigger value="salary-info">Salary Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="resume" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Profile Picture and Basic Info */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-6">
                    <div className="relative">
                      <Avatar className="w-24 h-24">
                        <AvatarImage src="/placeholder-user.jpg" alt={profileData.name} />
                        <AvatarFallback>
                          {profileData.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <button className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors">
                        <Pencil size={14} />
                      </button>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <Label htmlFor="name">My Name</Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="loginId">Login ID</Label>
                        <Input
                          id="loginId"
                          value={profileData.loginId}
                          onChange={(e) => handleInputChange("loginId", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="mobile">Mobile</Label>
                        <Input
                          id="mobile"
                          value={profileData.mobile}
                          onChange={(e) => handleInputChange("mobile", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Company Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Employment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={profileData.company}
                      onChange={(e) => handleInputChange("company", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={profileData.department}
                      onChange={(e) => handleInputChange("department", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="manager">Manager</Label>
                    <Input
                      id="manager"
                      value={profileData.manager}
                      onChange={(e) => handleInputChange("manager", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profileData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* About Section */}
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={profileData.about}
                    onChange={(e) => handleInputChange("about", e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="min-h-32"
                  />
                </CardContent>
              </Card>

              {/* What I love about my job */}
              <Card>
                <CardHeader>
                  <CardTitle>What I love about my job</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={profileData.jobLove}
                    onChange={(e) => handleInputChange("jobLove", e.target.value)}
                    placeholder="Share what you love about your job..."
                    className="min-h-32"
                  />
                </CardContent>
              </Card>

              {/* My interests and hobbies */}
              <Card>
                <CardHeader>
                  <CardTitle>My interests and hobbies</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={profileData.interests}
                    onChange={(e) => handleInputChange("interests", e.target.value)}
                    placeholder="Share your interests and hobbies..."
                    className="min-h-32"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Skills */}
              <Card>
                <CardHeader>
                  <CardTitle>Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 min-h-48 border rounded-md p-4">
                    {profileData.skills.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No skills added yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profileData.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2"
                          >
                            {skill}
                            <button
                              onClick={() => handleRemoveSkill(index)}
                              className="hover:text-destructive"
                              type="button"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" onClick={handleAddSkill} className="mt-4 w-full">
                    <Plus size={16} className="mr-2" />
                    Add Skills
                  </Button>
                </CardContent>
              </Card>

              {/* Certification */}
              <Card>
                <CardHeader>
                  <CardTitle>Certification</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 min-h-48 border rounded-md p-4">
                    {profileData.certifications.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No certifications added yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profileData.certifications.map((cert, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2"
                          >
                            {cert}
                            <button
                              onClick={() => handleRemoveCertification(index)}
                              className="hover:text-destructive"
                              type="button"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" onClick={handleAddCertification} className="mt-4 w-full">
                    <Plus size={16} className="mr-2" />
                    Add Certification
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="private-info" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profileData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Input
                    id="gender"
                    value={profileData.gender}
                    onChange={(e) => handleInputChange("gender", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Input
                    id="maritalStatus"
                    value={profileData.maritalStatus}
                    onChange={(e) => handleInputChange("maritalStatus", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    value={profileData.nationality}
                    onChange={(e) => handleInputChange("nationality", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfJoining">Date of Joining</Label>
                  <Input
                    id="dateOfJoining"
                    type="date"
                    value={profileData.dateOfJoining}
                    onChange={(e) => handleInputChange("dateOfJoining", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="personalEmail">Personal Email</Label>
                  <Input
                    id="personalEmail"
                    type="email"
                    value={profileData.personalEmail}
                    onChange={(e) => handleInputChange("personalEmail", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="residingAddress">Residing Address</Label>
                  <Textarea
                    id="residingAddress"
                    value={profileData.residingAddress}
                    onChange={(e) => handleInputChange("residingAddress", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={profileData.accountNumber}
                    onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={profileData.bankName}
                    onChange={(e) => handleInputChange("bankName", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input
                    id="ifscCode"
                    value={profileData.ifscCode}
                    onChange={(e) => handleInputChange("ifscCode", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="panNo">PAN No</Label>
                  <Input
                    id="panNo"
                    value={profileData.panNo}
                    onChange={(e) => handleInputChange("panNo", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="uanNo">UAN NO</Label>
                  <Input
                    id="uanNo"
                    value={profileData.uanNo}
                    onChange={(e) => handleInputChange("uanNo", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="empCode">Emp Code</Label>
                  <Input
                    id="empCode"
                    value={profileData.empCode}
                    onChange={(e) => handleInputChange("empCode", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary-info" className="space-y-6 mt-6">
          <SalaryInfoTab employeeId={employeeId} />
        </TabsContent>

        <TabsContent value="security" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" className="mt-1" />
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

