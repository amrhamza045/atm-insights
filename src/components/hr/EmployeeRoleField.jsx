import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRoleOptions } from "@/components/admin/users/useRoleOptions";
import { useDepartments } from "@/components/hr/useDepartments";

/**
 * System role for a staff member. Sourced live from the Role catalog and
 * soft-filtered by the selected department's allowed roles (when it lists any).
 * Admin-level roles are offered only to central admins.
 */
export default function EmployeeRoleField({ value, onChange, department, canAssignPrivileged = false, disabled = false, lockedReason }) {
  const { roleOptions } = useRoleOptions();
  const { departments } = useDepartments();

  const options = useMemo(() => {
    const allowed = departments.find((d) => d.name === department)?.user_roles;
    let narrowed = allowed?.length ? roleOptions.filter((r) => allowed.includes(r.value)) : roleOptions;
    if (!canAssignPrivileged) narrowed = narrowed.filter((r) => !r.privileged);
    // Keep an already-assigned role visible even if it's filtered out.
    if (value && !narrowed.some((r) => r.value === value)) {
      return [...narrowed, { value, label: roleOptions.find((r) => r.value === value)?.label || value }];
    }
    return narrowed;
  }, [roleOptions, departments, department, value, canAssignPrivileged]);

  return (
    <div>
      <Label>Role</Label>
      <Select value={value || ""} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="No system access" />
        </SelectTrigger>
        <SelectContent>
          {options.map((r) => (
            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-slate-500 mt-1">
        {lockedReason || "Grants this role's permissions. Roles are managed in Access Control → Role Management."}
      </p>
    </div>
  );
}