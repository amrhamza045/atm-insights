import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ALL_PERMISSION_KEYS } from "@/components/permissions/permissionKeys";
import ModuleAccessEditor from "@/components/admin/users/ModuleAccessEditor";

const toKey = (label) => label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export default function AddRoleDialog({ open, onOpenChange, departments, existingKeys, tabs, onCreated }) {
  const queryClient = useQueryClient();
  const [deptId, setDeptId] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [perms, setPerms] = useState({});
  const [disabledModules, setDisabledModules] = useState([]);
  const [disabledTabs, setDisabledTabs] = useState([]);

  const reset = () => { setDeptId(""); setLabel(""); setDescription(""); setPerms({}); setDisabledModules([]); setDisabledTabs([]); };

  const mutation = useMutation({
    mutationFn: async () => {
      const dept = departments.find((d) => d.id === deptId);
      const role_key = toKey(label);
      await base44.entities.Role.create({
        role_key,
        role_label: label.trim(),
        description: description.trim(),
        permissions: Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, !!perms[k]])),
        disabled_modules: disabledModules,
        disabled_tabs: disabledTabs,
        is_system: false,
        is_active: true,
        sort_order: 100,
      });
      await base44.entities.Department.update(dept.id, {
        user_roles: [...new Set([...(dept.user_roles || []), role_key])],
      });
      return role_key;
    },
    onSuccess: (role_key) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Role created");
      reset();
      onOpenChange(false);
      onCreated?.(role_key);
    },
    onError: (e) => toast.error(e?.message || "Could not create role"),
  });

  const submit = () => {
    if (!deptId) return toast.error("Choose a department first");
    if (!label.trim()) return toast.error("Role name is required");
    const key = toKey(label);
    if (!key) return toast.error("Role name must contain letters or numbers");
    if (existingKeys.includes(key)) return toast.error("A role with this name already exists");
    mutation.mutate();
  };

  const toggle = (k) => setPerms((p) => ({ ...p, [k]: !p[k] }));
  const setMany = (keys, on) => setPerms((p) => ({ ...p, ...Object.fromEntries(keys.map((k) => [k, on])) }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Add New Role</DialogTitle>
          <DialogDescription>The role is added to the chosen department and becomes available when inviting or assigning users.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Department *</Label>
              <Select value={deptId} onValueChange={setDeptId}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role Name *</Label>
              <Input placeholder="e.g. Event Coordinator" value={label} onChange={(e) => setLabel(e.target.value)} />
              {label.trim() && <p className="text-xs text-slate-400 mt-1">Key: {toKey(label)}</p>}
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input placeholder="Optional" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <ModuleAccessEditor tabs={tabs} disabledModules={disabledModules} onChange={setDisabledModules} disabledTabs={disabledTabs} onTabsChange={setDisabledTabs}
            permissions={perms} onPermissionToggle={toggle} onPermissionsSet={setMany} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={mutation.isPending} className="bg-blue-600 hover:bg-blue-700">
            {mutation.isPending ? "Creating…" : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}