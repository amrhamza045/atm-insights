import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Save, AlertCircle } from "lucide-react";
import UserIdentityHeader from "./UserIdentityHeader";
import { useRoleOptions } from "./useRoleOptions";
import ModuleAccessEditor from "@/components/admin/users/ModuleAccessEditor";

export default function UserDetailPanel({
  selectedUser,
  displayName,
  isCurrentUser,
  permissions,
  hasPermissionsRecord,
  isExEmployee,
  onToggle,
  onSave,
  isSaving,
  tabs = [],
  onModulesChange,
  onTabsChange,
  roleBaseline
}) {
  // Central platform-role rule, carried on the resolved permissions.
  const isAdmin = !!selectedUser && permissions?.platform_role === "admin";
  const { roleOptions } = useRoleOptions();
  const presetOptions = permissions?.role && !roleOptions.some(r => r.value === permissions.role)
    ? [...roleOptions, { value: permissions.role, label: permissions.role }]
    : roleOptions;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Manage Access
        </CardTitle>
        <CardDescription>
          Configure the role and granular permissions for the selected user. Sections with no enabled permissions will be hidden from them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!selectedUser ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Select a user to manage their permissions</p>
          </div>
        ) : (
          <>
            <UserIdentityHeader
              user={selectedUser}
              displayName={displayName}
              isCurrentUser={isCurrentUser}
              isAdmin={isAdmin}
              assignedRole={permissions?.role}
              isExEmployee={isExEmployee}
            />

            <ModuleAccessEditor
              tabs={tabs}
              disabledModules={permissions.disabled_modules || []}
              onChange={onModulesChange}
              disabledTabs={permissions.disabled_tabs || []}
              onTabsChange={onTabsChange}
              baseline={roleBaseline}
              readOnly={isAdmin}
              permissions={isAdmin ? undefined : permissions}
              onPermissionToggle={onToggle}
              lockedKeys={{ users_manage: "Comes only from the person's role. To make them an administrator, give them a role with Manage users." }}
            />

            {isAdmin ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 mx-auto text-purple-500 mb-3" />
                <p className="font-medium text-slate-900">Super Administrator</p>
                <p className="text-sm text-slate-500 mt-1">This user has full access to all features</p>
              </div>
            ) : (
              <>
                <div>
                  <Label>Role Preset</Label>
                  <div className="mt-1 rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {presetOptions.find(o => o.value === permissions.role)?.label || permissions.role || "No role"}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Roles are assigned from the HR module. Customize individual permissions in each module's Permissions dropdown above.
                  </p>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  {!hasPermissionsRecord && (
                    <p className="text-xs text-slate-500 mr-auto self-center">No role yet — assign one from the HR module before saving permissions.</p>
                  )}
                  <Button onClick={onSave} disabled={isSaving || !hasPermissionsRecord} className="bg-blue-600 hover:bg-blue-700">
                    <Save className="w-4 h-4 mr-2" />
                    Save Permissions
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}