import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { deleteCatalogRole } from "@/components/hr/roleCatalog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, Save, Trash2, Search, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ALL_PERMISSION_KEYS } from "@/components/permissions/permissionKeys";
import { CATALOG_KEYS } from "@/lib/modulePermissions";
import { useDepartments } from "@/components/hr/useDepartments";
import ModuleAccessEditor from "@/components/admin/users/ModuleAccessEditor";
import { resolveModules } from "@/lib/moduleRegistry";
import AddRoleDialog from "@/components/admin/roles/AddRoleDialog";
import HomePageField from "@/components/admin/roles/HomePageField";
import AdminRoleNotice from "@/components/admin/roles/AdminRoleNotice";
import { Plus } from "lucide-react";

const blankPermissions = () =>
  Object.fromEntries(ALL_PERMISSION_KEYS.map(k => [k, false]));

export default function RoleManagement({ tabs = [] }) {
  const [selectedRoleKey, setSelectedRoleKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [draft, setDraft] = useState(null); // { role_key, role_label, description, permissions, is_system }
  const [addOpen, setAddOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => base44.entities.Role.list("sort_order")
  });

  // The role list is read-only and comes from the HR module: the system roles
  // each department is allowed to grant (HR & Payroll → Departments & Roles).
  const { departments } = useDepartments();
  const hrRoles = useMemo(() => {
    const map = new Map();
    roles.forEach((r) => map.set(r.role_key, { value: r.role_key, label: r.role_label, departments: [] }));
    departments.forEach((d) => {
      (d.user_roles || []).forEach((value) => {
        // A department may still reference a role key with no Role record yet —
        // show the key itself rather than a hardcoded label list.
        if (!map.has(value)) map.set(value, { value, label: value, departments: [] });
        map.get(value).departments.push(d.name);
      });
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [departments, roles]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role created successfully");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Role updated successfully");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (role) => deleteCatalogRole(role),
    onError: (e) => toast.error(e.message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Role deleted");
      setSelectedRoleKey("");
      setDraft(null);
    }
  });

  const selectedRole = roles.find(r => r.role_key === selectedRoleKey);
  const knownModules = useMemo(() => new Set(resolveModules(tabs).map(m => m.key)), [tabs]);

  const handleSelectRole = (hrRole) => {
    const existing = roles.find(r => r.role_key === hrRole.value);
    setSelectedRoleKey(hrRole.value);
    setDraft({
      role_key: hrRole.value,
      role_label: existing?.role_label || hrRole.label,
      description: existing?.description || "",
      permissions: { ...blankPermissions(), ...(existing?.permissions || {}) },
      disabled_modules: existing?.disabled_modules || [],
      disabled_tabs: existing?.disabled_tabs || [],
      home_page: existing?.home_page || "",
      is_system: existing?.is_system || false,
      is_active: existing?.is_active !== false,
      sort_order: existing?.sort_order || 0
    });
  };

  const handleToggle = (key) => {
    setDraft(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] }
    }));
  };

  const handleSetMany = (keys, on) => {
    setDraft(prev => ({
      ...prev,
      permissions: { ...prev.permissions, ...Object.fromEntries(keys.map(k => [k, on])) }
    }));
  };

  const handleEnableAll = () => {
    setDraft(prev => ({
      ...prev,
      disabled_modules: [],
      disabled_tabs: [],
      // Manage users makes the role's holders full administrators: it is only ever switched on by itself.
      permissions: Object.fromEntries(ALL_PERMISSION_KEYS.map(k => [k, k === "users_manage" ? !!prev.permissions.users_manage : true]))
    }));
  };

  const handleClearAll = () => {
    setDraft(prev => ({ ...prev, permissions: blankPermissions(), disabled_modules: resolveModules(tabs).map(m => m.key) }));
  };

  const handleSave = async () => {
    if (!draft.role_label?.trim()) {
      toast.error("Role label is required");
      return;
    }
    const payload = {
      role_key: draft.role_key.trim().toLowerCase().replace(/\s+/g, "_"),
      role_label: draft.role_label.trim(),
      description: draft.description?.trim() || "",
      permissions: Object.fromEntries(
        ALL_PERMISSION_KEYS.map(k => [k, draft.permissions[k] || false])
      ),
      // Modules that no longer exist are dropped on save.
      disabled_modules: (draft.disabled_modules || []).filter(k => knownModules.has(k)),
      disabled_tabs: draft.disabled_tabs || [],
      home_page: draft.home_page || "",
      is_system: draft.is_system,
      is_active: draft.is_active,
      sort_order: draft.sort_order || 0
    };

    if (selectedRole) {
      await updateMutation.mutateAsync({ id: selectedRole.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const handleDelete = () => {
    if (!selectedRole) return;
    if (!window.confirm(`Delete role "${selectedRole.role_label}"?`)) return;
    deleteMutation.mutate(selectedRole);
  };

  const filteredRoles = hrRoles
    .filter(r =>
      !searchQuery ||
      r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.value.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const enabledCount = (perms) =>
    CATALOG_KEYS.filter(k => perms?.[k]).length;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <AddRoleDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        departments={departments.filter((d) => d.is_active !== false)}
        existingKeys={[...new Set([...hrRoles.map((r) => r.value), ...roles.map((r) => r.role_key)])]}
        tabs={tabs}
        onCreated={(key) => setSelectedRoleKey(key)}
      />
      {/* Role List */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5" />
                Roles
              </CardTitle>
              <CardDescription className="mt-1">Manage role permission presets</CardDescription>
            </div>
            <Button size="sm" onClick={() => setAddOpen(true)} className="bg-blue-600 hover:bg-blue-700 shrink-0">
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[28rem] overflow-y-auto">
              {filteredRoles.map(role => {
                const preset = roles.find(r => r.role_key === role.value);
                return (
                  <button
                    key={role.value}
                    onClick={() => handleSelectRole(role)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedRoleKey === role.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{role.label}</p>
                        <p className="text-xs text-slate-500 truncate">{role.value}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {enabledCount(preset?.permissions)}/{CATALOG_KEYS.length}
                        </Badge>
                        {preset?.is_system && <ShieldCheck className="w-4 h-4 text-blue-500" />}
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredRoles.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-8">
                  No roles defined yet — use "Add Role" to create one
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Editor */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {draft?.role_label || "Role Details"}
              </CardTitle>
              <CardDescription className="mt-1">
                Edit the permission preset for this role
              </CardDescription>
            </div>
            {selectedRole && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!draft ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Select a role to manage its permissions</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Role Label</Label>
                  <Input
                    value={draft.role_label}
                    onChange={e => setDraft(prev => ({ ...prev, role_label: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Role Key</Label>
                  <Input value={draft.role_key} disabled />
                  <p className="text-xs text-slate-400 mt-1">Role key cannot be changed after creation</p>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Optional description of this role"
                  value={draft.description}
                  onChange={e => setDraft(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <HomePageField
                role={draft}
                onChange={home_page => setDraft(prev => ({ ...prev, home_page }))}
              />

              {selectedRole?.is_system && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    This is a system role migrated from your original configuration. It can be deleted once no user holds it.
                  </p>
                </div>
              )}

              <AdminRoleNotice role={draft} />

              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  <span className="font-medium text-slate-900">{enabledCount(draft.permissions)}</span> of {CATALOG_KEYS.length} permissions enabled
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleEnableAll} title="Turns on every permission except Manage users">
                    Enable All
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleClearAll}>
                    Clear All
                  </Button>
                </div>
              </div>

              <ModuleAccessEditor
                tabs={tabs}
                disabledModules={draft.disabled_modules}
                onChange={disabled_modules => setDraft(prev => ({ ...prev, disabled_modules }))}
                disabledTabs={draft.disabled_tabs}
                onTabsChange={disabled_tabs => setDraft(prev => ({ ...prev, disabled_tabs }))}
                permissions={draft.permissions}
                onPermissionToggle={handleToggle}
                onPermissionsSet={handleSetMany}
              />

              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}