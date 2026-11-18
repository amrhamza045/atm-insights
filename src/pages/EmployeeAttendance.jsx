import { useState, useEffect } from "react";
import { companyToday } from "@/components/utils/timezoneHelper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import { LogIn, LogOut, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import FaceScanner from "@/components/employee/FaceScanner";
import LocationVerification from "@/components/employee/LocationVerification";
import ManualAttendanceRequest from "@/components/employee/ManualAttendanceRequest";
import ManualSignOut from "@/components/employee/ManualSignOut";
import NextDayPenaltyNotices from "@/components/employee/NextDayPenaltyNotices";
import AdvanceRequestCard from "@/components/employee/AdvanceRequestCard";
import { useAttendanceTarget } from "@/components/employee/useAttendanceTarget";

import { useRoleLabels } from "@/components/admin/users/useRoleOptions";
import { useDepartments } from "@/components/hr/useDepartments";
import { useIsAdmin, usePermissions } from "@/components/permissions/PermissionsContext";

export default function EmployeeAttendance() {
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [signInTab, setSignInTab] = useState("face");
  // Sign-in methods closed in Admin › Modules are left out.
  const screenTabs = useScreenTabs("EmployeeAttendance");
  const shownSignInTab = screenTabs.pick(signInTab, ["face", "location", "hr"]);
  const openSignInCount = ["face", "location", "hr"].filter(screenTabs.isOpen).length;
  const [faceData, setFaceData] = useState(null);
  const [locationVerified, setLocationVerified] = useState(null);
  const [isFaceVerified, setIsFaceVerified] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ["employee", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const employees = await base44.entities.Employee.filter({ email: currentUser.email });
      return employees[0] || null;
    },
    enabled: !!currentUser?.email
  });

  // Access comes from PermissionsProvider — no duplicate permission read.
  const { isLoadingAccess: permissionsLoading, permissions } = usePermissions();
  const roleLabels = useRoleLabels();
  const { departments } = useDepartments();

  const isSuperUser = useIsAdmin();

  // Clock-in pin of the employee's own branch (the default branch when none is set).
  const { data: restaurantLocation, isFetched: branchPinChecked } = useQuery({
    queryKey: ["attendanceBranchPin", employee?.branch_id],
    enabled: !!employee,
    queryFn: async () => {
      const branches = await base44.entities.Branch.list();
      const branch = branches.find((b) => b.id === employee.branch_id) || branches.find((b) => b.is_default) || branches[0];
      return branch?.latitude != null && branch?.longitude != null ? branch : null;
    }
  });

  const { target: attendanceTarget, missingPin, eventName } = useAttendanceTarget({
    employeeId: employee?.id,
    restaurantLocation,
  });

  const { data: todayShift } = useQuery({
    queryKey: ["todayShift", employee?.id],
    queryFn: async () => {
      if (!employee?.id) return null;
      const today = companyToday();
      const shifts = await base44.entities.Shift.filter({
        employee_id: employee.id,
        shift_date: today
      });
      return shifts[0];
    },
    enabled: !!employee?.id
  });

  const { data: attendance } = useQuery({
    queryKey: ["todayAttendance", employee?.id],
    queryFn: async () => {
      if (!employee?.id) return null;
      const today = companyToday();
      const records = await base44.entities.Attendance.filter({
        employee_id: employee.id,
        attendance_date: today
      });
      return records[0];
    },
    enabled: !!employee?.id,
    refetchInterval: 5000
  });

  // Face registration status comes from the server; the photo itself never reaches the browser.
  const { data: faceStatus } = useQuery({
    queryKey: ["attendanceFaceStatus", employee?.id],
    queryFn: async () => (await base44.functions.invoke("attendanceClock", { action: "status" })).data,
    enabled: !!employee?.id && employee.status !== "terminated" && employee.status !== "inactive"
  });
  const hasFace = !!faceStatus?.has_face;

  // Clock in/out runs on the server: it checks the face, sets the time and only acts on your own record.
  const clock = async (action) => {
    if (!locationVerified?.verified) throw new Error("Location not verified");
    if (!hasFace) throw new Error("No face photo registered. Please contact admin to register your face first.");
    if (!isFaceVerified || !faceData?.image) throw new Error("Please capture your face first.");
    try {
      const res = await base44.functions.invoke("attendanceClock", {
        action,
        image: faceData.image,
        latitude: locationVerified.latitude,
        longitude: locationVerified.longitude,
        location_verified: true
      });
      return res.data;
    } catch (e) {
      throw new Error(e.response?.data?.error || e.message);
    }
  };

  const signInMutation = useMutation({
    mutationFn: () => clock("sign_in"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todayAttendance"] });
      toast.success("Signed in successfully");
      setFaceData(null);
      setIsFaceVerified(false);
      setLocationVerified(null);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const signOutMutation = useMutation({
    mutationFn: () => clock("sign_out"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todayAttendance"] });
      toast.success("Signed out successfully");
      setFaceData(null);
      setIsFaceVerified(false);
      setLocationVerified(null);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Wait for auth-dependent queries to resolve before checking access
  if (!currentUser || employeeLoading || permissionsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  // Restrict access to employees and superusers only
  if (!employee && !isSuperUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <LogOut className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h3>
            <p className="text-sm text-slate-600">
              This page is only accessible to employees. Please contact admin if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPendingManual = attendance?.status === "pending_hr_confirmation";
  const isRejectedManual = attendance?.status === "rejected_hr_confirmation";
  const isSignedIn = !!attendance?.sign_in_time && !attendance?.sign_out_time && !isPendingManual && !isRejectedManual;
  const manualBlockedReason = isPendingManual ? "A request is already awaiting HR confirmation." : isSignedIn ? "You are already signed in." : "";
  const statusLabel = isPendingManual ? "Awaiting HR confirmation" : isRejectedManual ? "HR confirmation rejected" : isSignedIn ? "Signed In" : "Signed Out";

  const isAdminPreview = isSuperUser && !employee;

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Employee Info */}
        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold">{employee?.name || currentUser?.full_name || "Admin"}</h1>
            <p className="text-slate-600">{employee
              ? (permissions?.role && permissions.role !== "view_only" ? roleLabels[permissions.role] || permissions.role : null)
                || departments.find(d => d.id === employee.department || d.name === employee.department)?.name
                || employee.department || ""
              : "Administrator"}</p>
            {isAdminPreview && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                You are viewing the Biometric Attendance &amp; Geolocation page as an admin. Sign-in actions require an employee record with a registered face photo.
              </div>
            )}
            {todayShift && (
              <div className="mt-4 p-3 bg-slate-100 rounded-lg text-sm">
                <p className="text-slate-600">Today's Shift</p>
                <p className="font-semibold">{todayShift.start_time} - {todayShift.end_time}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {employee && <NextDayPenaltyNotices employeeId={employee.id} />}
        {employee && <AdvanceRequestCard />}

        {/* Attendance Status */}
        {attendance && (
          <Card className={isPendingManual ? "border-amber-200 bg-amber-50" : isRejectedManual ? "border-red-200 bg-red-50" : isSignedIn ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm text-slate-600">Status</p>
                  <Badge className={isPendingManual ? "bg-amber-500" : isRejectedManual ? "bg-red-600" : isSignedIn ? "bg-green-600" : "bg-blue-600"}>
                    {statusLabel}
                  </Badge>
                  {isRejectedManual && attendance.hr_rejection_reason && <p className="text-sm text-red-700 mt-2">Reason: {attendance.hr_rejection_reason}</p>}
                </div>
                {attendance.sign_in_time && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{isPendingManual || isRejectedManual ? "Request time" : "Sign In"}</p>
                    <p className="font-semibold">{new Date(attendance.sign_in_time).toLocaleTimeString()}</p>
                  </div>
                )}
                {attendance.sign_out_time && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Sign Out</p>
                    <p className="font-semibold">{new Date(attendance.sign_out_time).toLocaleTimeString()}</p>
                  </div>
                )}
                {attendance.hours_worked && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Hours</p>
                    <p className="font-semibold flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {attendance.hours_worked.toFixed(2)}h
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sign In/Out */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isSignedIn ? <LogOut className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              {isSignedIn ? "Sign Out" : "Sign In"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!shownSignInTab ? <ClosedTabsNotice /> : (
            <Tabs value={shownSignInTab} onValueChange={setSignInTab}>
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${openSignInCount}, minmax(0, 1fr))` }}>
                {screenTabs.isOpen("face") && <TabsTrigger value="face">Face Scan</TabsTrigger>}
                {screenTabs.isOpen("location") && <TabsTrigger value="location">Location</TabsTrigger>}
                {screenTabs.isOpen("hr") && <TabsTrigger value="hr">HR Confirm</TabsTrigger>}
              </TabsList>

              <TabsContent value="face" className="space-y-4">
                {hasFace ? (
                  <FaceScanner 
                    onFaceCaptured={(image) => {
                      setFaceData({ image });
                      setIsFaceVerified(true);
                    }}
                    mode="verify"
                  />
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
                    <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-amber-800">No Face Registered</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Your face photo hasn't been registered yet. Please contact an admin to capture your face during employee registration.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="location" className="space-y-4">
                {missingPin ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    You are staffed at the event site for “{eventName}”, but the venue has no map pin yet.
                    Ask your manager to pin the venue before you clock in.
                  </div>
                ) : attendanceTarget ? (
                  <LocationVerification
                    restaurantLocation={attendanceTarget}
                    maxRadius={attendanceTarget.radius}
                    locationLabel={attendanceTarget.label}
                    onLocationVerified={setLocationVerified}
                  />
                ) : branchPinChecked ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Your branch has no clock-in location yet. Ask your manager to set it.
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="hr" className="space-y-4">
                {isSignedIn ? (
                  <ManualSignOut />
                ) : (
                  <ManualAttendanceRequest
                    blockedReason={manualBlockedReason}
                    onSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ["todayAttendance"] });
                      toast.success("Check-in request sent to HR");
                    }}
                  />
                )}
              </TabsContent>
            </Tabs>
            )}

            {shownSignInTab && shownSignInTab !== "hr" && (
              <>
                <Button
                  onClick={() => isSignedIn ? signOutMutation.mutate() : signInMutation.mutate()}
                  disabled={
                    isPendingManual ||
                    !hasFace ||
                    !isFaceVerified ||
                    !locationVerified?.verified ||
                    signInMutation.isPending ||
                    signOutMutation.isPending
                  }
                  className="w-full"
                  size="lg"
                >
                  {isSignedIn ? (signOutMutation.isPending ? "Signing Out..." : "Sign Out") : (signInMutation.isPending ? "Signing In..." : "Sign In")}
                </Button>

                {hasFace && (!isFaceVerified || !locationVerified?.verified) && (
                  <div className="flex items-center justify-center gap-4 text-xs">
                    <span className={isFaceVerified ? "text-green-600 font-medium" : "text-slate-400"}>
                      {isFaceVerified ? "✓ Face Captured" : "○ Face Scan Pending"}
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className={locationVerified?.verified ? "text-green-600 font-medium" : "text-slate-400"}>
                      {locationVerified?.verified ? "✓ Location Verified" : "○ Location Pending"}
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}