import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import UserListPanel from "./UserListPanel";
import UserDetailPanel from "./UserDetailPanel";
import resolveEffectivePermissions from "@/components/permissions/resolveEffectivePermissions";
import { ROLES_CATALOG_KEY } from "@/components/permissions/PermissionsContext";
import { computePermissionOverrides, computeModuleOverrides, computeTabOverrides } from "./overrideDiff";
import { platformRoleFor } from "@/components/permissions/platformRoleRule";

export default function UsersWorkspace({ tabs = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [permissions, setPermissions] = useState({});

  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error: usersError } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list("-created_date")
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: userPermissionsList = [] } = useQuery({
    queryKey: ["allUserPermissions"],
    queryFn: () => base44.entities.UserPermissions.list("-created_date", 500)
  });

  // The live role catalog — the baseline every override is measured against.
  const { data: roles = [] } = useQuery({
    queryKey: ROLES_CATALOG_KEY,
    queryFn: () => base44.entities.Role.list()
  });

  const roleRecordFor = (roleKey) =>
    roleKey ? roles.find(r => r.role_key === roleKey && r.is_active !== false) || null : null;

  const { data: employees = [] } = useQuery({
    queryKey: ["allEmployeesForFilter"],
    queryFn: () => base44.entities.Employee.list("-created_date", 500)
  });

  const employeeByEmail = useMemo(() => {
    const map = new Map();
    employees.forEach(employee => {
      const email = employee.email?.trim().toLowerCase();
      if (email && !map.has(email)) map.set(email, employee);
    });
    return map;
  }, [employees]);
  const getDisplayName = (user) =>
    employeeByEmail.get(user?.email?.trim().toLowerCase())?.name?.trim() || user?.full_name || "Unnamed User";

  const employeeEmailSet = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      if (e.email) set.add(e.email.toLowerCase());
    });
    return set;
  }, [employees]);

  const permissionsMap = useMemo(() => {
    const map = {};
    userPermissionsList.forEach(p => {
      if (p.user_email) map[p.user_email.toLowerCase()] = p;
    });
    return map;
  }, [userPermissionsList]);

  const getUserRole = (user) => permissionsMap[user.email?.toLowerCase()]?.role || "user";
  // Platform role per the central rule (what the account is, or will be synced to).
  const getPlatformRole = (user) => {
    const row = permissionsMap[user.email?.toLowerCase()];
    return platformRoleFor({ isSafetyValve: user.perm_is_safety_valve === true, roleKey: row?.role, roleRecord: roleRecordFor(row?.role), isExEmployee: row?.is_ex_employee === true });
  };
  const isEmployee = (user) => employeeEmailSet.has(user.email?.toLowerCase());
  const isExEmployee = (user) => permissionsMap[user.email?.toLowerCase()]?.is_ex_employee === true;
  const getPreviousRole = (user) => permissionsMap[user.email?.toLowerCase()]?.previous_role;

  const selectedUser = users.find(u => u.email === selectedUserEmail);
  const selectedUserPermissions = userPermissionsList.find(p => p.user_email === selectedUserEmail);
  // The selected user's live role: the baseline their access list starts from.
  const selectedRoleRecord = roleRecordFor(selectedUserPermissions?.role);

  // Refresh both the admin list AND the edited user's own row key
  // ("userPermissions", email) — that key feeds their live permission resolution.
  const syncSavedPermissions = (saved) => {
    if (!saved?.user_email) return;
    queryClient.setQueryData(["allUserPermissions"], current => {
      const rows = current || [];
      const index = rows.findIndex(row => row.user_email?.toLowerCase() === saved.user_email.toLowerCase());
      return index < 0 ? [saved, ...rows] : rows.map((row, i) => i === index ? saved : row);
    });
    queryClient.setQueryData(["userPermissions", saved.user_email], saved);
  };

  const updatePermsMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserPermissions.update(id, data),
    onSuccess: (saved) => { syncSavedPermissions(saved); toast.success("Permissions updated successfully"); }
  });

  const handleUserSelect = (user) => {
    setSelectedUserEmail(user.email);
    const row = userPermissionsList.find(p => p.user_email === user.email) || null;
    setPermissions(resolveEffectivePermissions({
      row,
      roleRecord: roleRecordFor(row?.role),
      currentUser: { email: user.email, full_name: user.full_name, role: user.role }
    }));
  };

  // Keep the selected user's access in step with their live role: re-read it
  // when the role record arrives (slow first load) or is edited.
  const roleStamp = selectedRoleRecord ? `${selectedRoleRecord.id}:${selectedRoleRecord.updated_date}` : "";
  useEffect(() => {
    if (selectedUser) handleUserSelect(selectedUser);
  }, [roleStamp]);

  const handleToggle = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Saves ONLY per-user overrides. The role itself is never written here —
  // roles are assigned from the HR module.
  const handleSave = async () => {
    if (!selectedUserEmail) { toast.error("Please select a user"); return; }
    if (!selectedUserPermissions) { toast.error("Assign a role from the HR module first"); return; }
    const roleRecord = roleRecordFor(selectedUserPermissions.role);
    // Store ONLY the keys the admin set differently from the role's live value.
    const permissionData = {
      permission_overrides: computePermissionOverrides(permissions, roleRecord),
      module_overrides: computeModuleOverrides(permissions.disabled_modules, roleRecord),
      tab_overrides: computeTabOverrides(permissions.disabled_tabs, roleRecord)
    };
    await updatePermsMutation.mutateAsync({ id: selectedUserPermissions.id, data: permissionData });
    if (selectedUser?.id) {
      await base44.functions.invoke("syncPermissionCopy", { trigger: "override", user_id: selectedUser.id });
    }
    await queryClient.refetchQueries({ queryKey: ["allUserPermissions"], exact: true, type: "active" });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery ||
      getDisplayName(user).toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || getUserRole(user) === roleFilter;
    const employeeMatch = isEmployee(user);
    const exEmployee = isExEmployee(user);
    let matchesType = typeFilter === "all";
    if (typeFilter === "employees") matchesType = employeeMatch && !exEmployee;
    else if (typeFilter === "ex_employees") matchesType = exEmployee;
    else if (typeFilter === "users") matchesType = !employeeMatch && !exEmployee;
    return matchesSearch && matchesRole && matchesType;
  });

  return (
    <>
      <div className="grid lg:grid-cols-3 gap-6">
        <UserListPanel
          users={filteredUsers}
          getDisplayName={getDisplayName}
          isLoading={isLoading}
          loadError={usersError}
          totalUserCount={users.length}
          currentUserEmail={currentUser?.email}
          selectedEmail={selectedUserEmail}
          onSelect={handleUserSelect}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          getUserRole={getUserRole}
          getPlatformRole={getPlatformRole}
          isEmployee={isEmployee}
          isExEmployee={isExEmployee}
          getPreviousRole={getPreviousRole}
        />

        <UserDetailPanel
          selectedUser={selectedUser}
          displayName={getDisplayName(selectedUser)}
          isCurrentUser={selectedUser?.email === currentUser?.email}
          permissions={permissions}
          tabs={tabs}
          onModulesChange={disabled_modules => setPermissions(prev => ({ ...prev, disabled_modules }))}
          onTabsChange={disabled_tabs => setPermissions(prev => ({ ...prev, disabled_tabs }))}
          roleBaseline={selectedRoleRecord ? { modules: selectedRoleRecord.disabled_modules || [], tabs: selectedRoleRecord.disabled_tabs || [] } : undefined}
          hasPermissionsRecord={!!selectedUserPermissions}
          isExEmployee={selectedUser ? isExEmployee(selectedUser) : false}
          onToggle={handleToggle}
          onSave={handleSave}
          isSaving={updatePermsMutation.isPending}
        />
      </div>
    </>
  );
}