import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Save, Users } from "lucide-react";
import RoleListEditor from "./RoleListEditor";
import { useRoleOptions } from "@/components/admin/users/useRoleOptions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ensureCatalogRole } from "./roleCatalog";

export default function DepartmentDetailPanel({ department, employeeCount, onUpdate, onDelete, saving }) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  // Live Role catalog — custom roles are offered here automatically.
  const { roleOptions } = useRoleOptions();

  useEffect(() => {
    setName(department.name || "");
    setNotes(department.notes || "");
    setIsActive(department.is_active !== false);
  }, [department]);

  const dirty =
    name.trim() !== (department.name || "") ||
    notes !== (department.notes || "") ||
    isActive !== (department.is_active !== false);

  const queryClient = useQueryClient();
  const { data: catalog = [] } = useQuery({ queryKey: ["roles"], queryFn: () => base44.entities.Role.list("sort_order") });
  const deptKeys = department.user_roles || [];
  const labelOf = (k) => catalog.find((r) => r.role_key === k)?.role_label || k;

  // Department roles and system roles are one list: each entry is a Role catalog record.
  const saveKeys = (keys) => onUpdate({ user_roles: keys, positions: keys.map(labelOf) });

  const handleRolesChange = async (labels) => {
    const keys = [];
    for (const label of labels) {
      const prevKey = deptKeys.find((k) => labelOf(k) === label);
      keys.push(prevKey || (await ensureCatalogRole(label, catalog)).role_key);
    }
    queryClient.invalidateQueries({ queryKey: ["roles"] });
    onUpdate({ user_roles: keys, positions: labels });
  };

  const toggleUserRole = (value) =>
    saveKeys(deptKeys.includes(value) ? deptKeys.filter((r) => r !== value) : [...deptKeys, value]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{department.name}</h3>
          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
            <Users className="w-3.5 h-3.5" /> {employeeCount} employee{employeeCount === 1 ? "" : "s"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onDelete(department)} className="gap-1 text-red-600">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </Button>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <div>
          <Label>Department name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What this department covers" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Active</Label>
            <p className="text-xs text-slate-500">Inactive departments stay on existing employees but are hidden from new selections</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            className="gap-1"
            disabled={!dirty || saving || !name.trim()}
            onClick={() => onUpdate({ name: name.trim(), notes, is_active: isActive })}
          >
            <Save className="w-3.5 h-3.5" /> Save details
          </Button>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <Label>Roles in {department.name}</Label>
        <p className="text-xs text-slate-500">
          Same list as the system roles below. A new name is added to Role Management automatically with Staff-level permissions.
        </p>
        <RoleListEditor roles={deptKeys.map(labelOf)} onChange={handleRolesChange} />
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <Label>Pick from existing system roles</Label>
        <p className="text-xs text-slate-500">
          Ticked roles are the ones offered on the employee and invite forms for this department. Select none to offer all.
        </p>
        <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pt-1">
          {roleOptions.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={(department.user_roles || []).includes(r.value)}
                onCheckedChange={() => toggleUserRole(r.value)}
              />
              {r.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}