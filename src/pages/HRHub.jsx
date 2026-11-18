import React, { Suspense } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import ChunkErrorBoundary from "@/components/ChunkErrorBoundary";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Clock, Settings, UserCheck, BarChart3, Calendar, AlertTriangle, Wallet, PoundSterling, Building2, Gavel, CalendarCheck } from "lucide-react";
import useTabTrail from "@/lib/useTabTrail";
import useScreenTabs from "@/hooks/useScreenTabs";
import ClosedTabsNotice from "@/components/modules/ClosedTabsNotice";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";

const MeetingsManager = lazy(() => import("@/components/hr/meetings/MeetingsManager"));
const DisciplinaryManager = lazy(() => import("@/components/hr/discipline/DisciplinaryManager"));
const EmployeeManagement = lazy(() => import("@/components/admin/EmployeeManagement"));
const AttendanceReview = lazy(() => import("@/components/admin/AttendanceReview"));
const AttendancePolicyManager = lazy(() => import("@/components/admin/AttendancePolicyManager"));
const AttendanceDashboard = lazy(() => import("@/components/admin/AttendanceDashboard"));
const DailyAttendanceSummary = lazy(() => import("@/components/admin/DailyAttendanceSummary"));
const ShiftManagement = lazy(() => import("@/components/admin/ShiftManagement"));
const SalaryPenaltyManager = lazy(() => import("@/components/hr/SalaryPenaltyManager"));
const EmployeeBorrowingManager = lazy(() => import("@/components/hr/EmployeeBorrowingManager"));
const BorrowingPolicyManager = lazy(() => import("@/components/hr/borrowings/BorrowingPolicyManager"));
const PayrollRunner = lazy(() => import("@/components/hr/PayrollRunner"));
const PayrollCutoffSetting = lazy(() => import("@/components/hr/PayrollCutoffSetting"));
const PayrollDashboard = lazy(() => import("@/components/hr/PayrollDashboard"));
const RestaurantLocationSettings = lazy(() => import("@/components/admin/RestaurantLocationSettings"));
const DepartmentManager = lazy(() => import("@/components/hr/DepartmentManager"));

const HR_TABS = [
  { id: "hr-employees", label: "Employees", icon: Users },
  { id: "hr-departments", label: "Departments & Roles", icon: Building2 },
  { id: "hr-attendance", label: "Attendance Review", icon: Clock },
  { id: "hr-policy", label: "Attendance Policy", icon: Settings },
  { id: "hr-dashboard-live", label: "Live Dashboard", icon: UserCheck },
  { id: "hr-summary", label: "Summary", icon: BarChart3 },
  { id: "hr-shifts", label: "Shifts", icon: Calendar },
  { id: "hr-penalties", label: "Penalties", icon: AlertTriangle },
  { id: "hr-discipline", label: "Disciplinary", icon: Gavel },
  { id: "hr-meetings", label: "Meetings", icon: CalendarCheck },
  { id: "hr-borrowings", label: "Borrowings", icon: Wallet },
  { id: "hr-borrowing-policy", label: "Advance Policy", icon: Settings },
  { id: "hr-payroll", label: "Payroll", icon: PoundSterling },
  { id: "hr-dashboard", label: "Payroll Dashboard", icon: BarChart3 },
  { id: "hr-location", label: "Restaurant Location", icon: Settings },
];

export default function HRHub() {
  const { currentUser, permissions } = usePermissions();
  const { isModuleEnabled } = useModuleAccess();
  const isAdmin = useIsAdmin();
  // Tabs closed in Admin › Modules (or whose HR module is closed) are left out.
  const tabs = useScreenTabs("HRHub").keep(HR_TABS, (t) => t.id);
  const [activeTab, setActiveTab] = useTabTrail(tabs.map((t) => ({ key: t.id, label: t.label })));
  // Phase 4: hr_view can open HR, hr_edit can change it (branch limits enforced by the data rules).
  const canViewHR = isAdmin || permissions?.hr_view_all === true || permissions?.hr_edit === true;
  const hrModuleEnabled = ['hr_employees', 'hr_attendance', 'hr_payroll', 'hr_shifts'].some(k => isModuleEnabled(k));

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!canViewHR || !hrModuleEnabled) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600">You need HR view or HR edit permission to access HR.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            HR & Payroll
          </h1>
          <p className="text-slate-500 mt-1">Employees, attendance, shifts and payroll</p>
        </div>

        {tabs.length === 0 ? <ClosedTabsNotice /> : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="border shadow-sm w-full h-auto flex-wrap justify-start bg-teal-50">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="gap-2 data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                  <Icon className="w-4 h-4" /> {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <ChunkErrorBoundary resetKey={activeTab}>
          <Suspense fallback={<div role="status" className="p-6 text-sm text-slate-500">Loading HR section…</div>}>
          <TabsContent value="hr-employees" className="space-y-6">
            <EmployeeManagement />
          </TabsContent>
          <TabsContent value="hr-departments"><DepartmentManager /></TabsContent>
          <TabsContent value="hr-attendance"><AttendanceReview /></TabsContent>
          <TabsContent value="hr-policy"><AttendancePolicyManager /></TabsContent>
          <TabsContent value="hr-dashboard-live"><AttendanceDashboard /></TabsContent>
          <TabsContent value="hr-summary"><DailyAttendanceSummary /></TabsContent>
          <TabsContent value="hr-shifts"><ShiftManagement /></TabsContent>
          <TabsContent value="hr-penalties" className="space-y-4">
            <div><h2 className="text-xl font-semibold text-slate-900 mb-1">Penalties & Deductions</h2><p className="text-sm text-slate-500">Record salary penalties and deductions applied at payroll</p></div>
            <SalaryPenaltyManager />
          </TabsContent>
          <TabsContent value="hr-meetings"><MeetingsManager /></TabsContent>
          <TabsContent value="hr-discipline"><DisciplinaryManager /></TabsContent>
          <TabsContent value="hr-borrowings" className="space-y-4">
            <div><h2 className="text-xl font-semibold text-slate-900 mb-1">Employee Borrowings</h2><p className="text-sm text-slate-500">Manage salary advances with automatic monthly installment deductions</p></div>
            <EmployeeBorrowingManager />
          </TabsContent>
          <TabsContent value="hr-borrowing-policy"><BorrowingPolicyManager /></TabsContent>
          <TabsContent value="hr-payroll" className="space-y-4">
            <div><h2 className="text-xl font-semibold text-slate-900 mb-1">Payroll Runner</h2><p className="text-sm text-slate-500">Calculate monthly salaries with overtime, penalties, and borrowing deductions auto-applied</p></div>
            <PayrollCutoffSetting />
            <PayrollRunner />
          </TabsContent>
          <TabsContent value="hr-dashboard" className="space-y-4">
            <div><h2 className="text-xl font-semibold text-slate-900 mb-1">Payroll Dashboard</h2><p className="text-sm text-slate-500">Monthly salary trends and payroll summaries over the past 6 months</p></div>
            <PayrollDashboard />
          </TabsContent>
          <TabsContent value="hr-location"><RestaurantLocationSettings /></TabsContent>
          </Suspense>
          </ChunkErrorBoundary>
        </Tabs>
        )}
      </div>
    </div>
  );
}