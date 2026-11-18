import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import DisciplineHistorySection from "@/components/hr/discipline/DisciplineHistorySection";
import SalaryRevisionsSection from "./SalaryRevisionsSection";
import AdvancesSection from "./AdvancesSection";
import DependabilitySection from "./DependabilitySection";
import AppraisalsSection from "./AppraisalsSection";

/** Lifetime company record: salary revisions, advances, dependability, discipline and appraisals. */
export default function LifetimeRecordTab({ employee, onClose }) {
  const { permissions } = usePermissions();
  const isAdmin = useIsAdmin();
  const canPropose = isAdmin || permissions?.hr_edit === true;
  const canDecide = isAdmin || permissions?.hr_attendance_approve === true;
  const canSeePay = canPropose || canDecide;

  return (
    <div className="space-y-4">
      {canSeePay && <SalaryRevisionsSection employee={employee} canPropose={canPropose} canDecide={canDecide} />}
      <AdvancesSection employee={employee} />
      <DependabilitySection employee={employee} />
      <DisciplineHistorySection employee={employee} onClose={onClose} />
      {canSeePay && <AppraisalsSection employee={employee} canPropose={canPropose} canDecide={canDecide} />}
    </div>
  );
}