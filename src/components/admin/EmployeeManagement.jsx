import { useState, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users, Search, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import EmployeeFaceCapture from "./EmployeeFaceCapture";
import { useBranch } from "@/components/branches/BranchContext";
import OptionSelectWithAdd from "./OptionSelectWithAdd";
import { useDepartments } from "@/components/hr/useDepartments";
import EmployeeRoleField from "@/components/hr/EmployeeRoleField";
import { assignEmployeeRole, reassignEmployeeBranch, deleteEmployeeRecord } from "@/components/hr/assignEmployeeRole";
import EmployeeBranchField from "@/components/hr/EmployeeBranchField";
import EmployeeInviteControl from "@/components/hr/EmployeeInviteControl";
import RemoveAccessButton from "@/components/hr/RemoveAccessButton";
import DeleteEmployeeButton from "@/components/hr/DeleteEmployeeButton";
import ExEmployeesTable from "@/components/hr/ExEmployeesTable";
import { useEmployeeAccess } from "@/components/hr/useEmployeeAccess";
import EmployeeProfileDialog from "@/components/hr/profile/EmployeeProfileDialog";
import EmployeeFilterPopover from "@/components/hr/EmployeeFilterPopover";
import EmployeeSearchBar from "@/components/hr/EmployeeSearchBar";
import { EMPTY_FILTERS, applyFilters, groupEmployees } from "@/components/hr/employeeFilters";
import { isSystemAccount } from "@/components/hr/systemAccount";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import { withEmployeePrivate, splitPrivate, saveEmployeePrivate } from "@/components/hr/employeePrivate";

export default function EmployeeManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileEmployeeId, setProfileEmployeeId] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [groupBy, setGroupBy] = useState("none");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    employee_id: "",
    department: "",
    role: "",
    employment_type: "regular",
    skills: "",
    hire_date: "",
    salary_type: "hourly",
    hourly_rate: "",
    fixed_salary: "",
    calculate_from_monthly: "",
    face_scan_data: ""
  });

  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();
  const { departments } = useDepartments();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", selectedBranchId, "directory"],
    queryFn: () => base44.entities.Employee.filter({ ...(!selectedBranchId ? {} : { branch_id: selectedBranchId }) }, "-created_date").then(withEmployeePrivate)
  });

  const { permissions, currentUser } = usePermissions();
  const isAdmin = useIsAdmin();
  const canEdit = isAdmin || permissions?.hr_edit === true;
  const isCentral = currentUser?.role === "admin" || currentUser?.perm_is_central_admin === true;

  // The user picker needs the platform user list (admins only).
  const { data: appUsers = [] } = useQuery({
    queryKey: ["appUsers"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin
  });

  // Role + "Registered" per employee come from the server (HR rules applied there).
  const access = useEmployeeAccess(employees);
  const isRegistered = (employee) => access[employee.id]?.registered === true;
  const roleFor = (employee) => access[employee.id]?.role || "";

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return appUsers;
    const query = userSearchQuery.toLowerCase();
    return appUsers.filter(u => 
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query)
    );
  }, [appUsers, userSearchQuery]);

  // Departments come only from the Department entity (HR → Departments).
  // Inactive ones stay visible if an employee is still on them.
  const departmentOptions = useMemo(() => {
    const active = departments.filter(d => d.is_active !== false).map(d => d.name);
    const used = employees.map(e => e.department).filter(Boolean);
    return [...new Set([...active, ...used])].sort();
  }, [departments, employees]);

  // Saving only preps access (permissions stay in sync); invitations are sent
  // explicitly from the Access column, never as a side effect of a save.
  const applyAccess = async ({ employeeId, email, role }) => {
    if (!email || !role) return;
    await assignEmployeeRole({ employeeId, roleKey: role, queryClient });
  };

  const createMutation = useMutation({
    mutationFn: async ({ role, ...data }) => {
      const { pub, priv } = splitPrivate(data);
      const employee = await base44.entities.Employee.create(pub);
      await saveEmployeePrivate(employee.id, priv);
      await applyAccess({ employeeId: employee.id, email: data.email, role });
      toast.success(
        data.email
          ? "Employee created — use Send Invite to email their sign-up link"
          : "Employee created — add an email to invite them later"
      );
      return employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      handleClose();
    },
    onError: (e) => toast.error(e.message)
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data: { role, branch_id, ...data }, previousEmail, previousRole, previousBranchId }) => {
      const { pub, priv } = splitPrivate(data);
      const employee = await base44.entities.Employee.update(id, pub);
      await saveEmployeePrivate(id, priv);
      if (branch_id && branch_id !== previousBranchId) {
        await reassignEmployeeBranch({ employeeId: id, branchId: branch_id, queryClient });
      }
      if (data.email && (data.email !== previousEmail || role !== previousRole)) {
        await applyAccess({ employeeId: id, email: data.email, role });
      }
      return employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee updated");
      handleClose();
    },
    onError: (e) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    // The server deletes the sign-in account first; nothing changes if that fails.
    mutationFn: (employee) => deleteEmployeeRecord({ employeeId: employee.id, queryClient }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["exEmployees"] });
      toast.success(res?.account_deleted ? "Employee moved to Ex-Employees and their sign-in account deleted" : "Employee moved to Ex-Employees");
    },
    onError: (e) => toast.error(e.message)
  });

  const handleSelectUser = (user) => {
    setFormData(prev => ({
      ...prev,
      name: user.full_name || "",
      email: user.email || ""
    }));
    setShowUserSelector(false);
    setUserSearchQuery("");
  };

  const handleOpen = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        name: employee.name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        employee_id: employee.employee_id || "",
        department: employee.department || "",
        role: roleFor(employee),
        branch_id: employee.branch_id || "",
        employment_type: employee.employment_type || "regular",
        skills: (employee.skills || []).join(", "),
        hire_date: employee.hire_date || "",
        salary_type: employee.salary_type || "hourly",
        hourly_rate: employee.hourly_rate || "",
        fixed_salary: employee.fixed_salary || "",
        calculate_from_monthly: "",
        face_scan_data: employee.face_scan_data || ""
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        employee_id: `EMP-${Date.now()}`,
        department: "",
        role: "",
        employment_type: "regular",
        skills: "",
        hire_date: "",
        salary_type: "hourly",
        hourly_rate: "",
        fixed_salary: "",
        calculate_from_monthly: "",
        face_scan_data: ""
      });
    }
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleSave = () => {
    if (!formData.name) {
      toast.error("Please fill all required fields");
      return;
    }

    let hourlyRate = formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined;
    let fixedSalary = formData.fixed_salary ? parseFloat(formData.fixed_salary) : undefined;

    // Calculate hourly rate from monthly salary if provided
    if (formData.calculate_from_monthly && parseFloat(formData.calculate_from_monthly) > 0) {
      const monthlyAmount = parseFloat(formData.calculate_from_monthly);
      hourlyRate = monthlyAmount / 240; // 30 days * 8 hours
    }

    const data = {
      ...formData,
      employee_id: formData.employee_id?.trim() || `EMP-${Date.now()}`,
      hourly_rate: hourlyRate,
      fixed_salary: fixedSalary,
      skills: formData.skills ? formData.skills.split(",").map(s => s.trim()).filter(Boolean) : [],
      calculate_from_monthly: undefined
    };

    if (editingEmployee) {
      updateMutation.mutate({
        id: editingEmployee.id,
        data,
        previousEmail: editingEmployee.email || "",
        previousRole: roleFor(editingEmployee),
        previousBranchId: editingEmployee.branch_id || ""
      });
    } else {
      createMutation.mutate({ ...data, branch_id: selectedBranchId, branch_name: selectedBranch?.name });
    }
  };

  const isSelf = (employee) => !!employee?.email && employee.email.toLowerCase() === currentUser?.email?.toLowerCase();
  // Server enforces the same rules; this just explains a locked field.
  const roleLockReason = !editingEmployee ? null
    : isSelf(editingEmployee) ? "You cannot change your own role."
    : access[editingEmployee.id]?.is_safety_valve ? "The safety-valve account's role cannot be changed."
    : null;

  const filterHelpers = { roleFor, isRegistered };
  const filteredEmployees = applyFilters(employees, filters, filterHelpers);
  const activeEmployees = filteredEmployees.filter(e => e.status === "active");
  const inactiveEmployees = filteredEmployees.filter(e => e.status !== "active");
  const roleOptions = [...new Set(employees.map(roleFor).filter(Boolean))].sort();

  const EmployeeRow = ({ employee }) => (
    <tr className="border-b hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <div>
          <button type="button" onClick={() => setProfileEmployeeId(employee.id)} className="font-medium text-slate-900 hover:text-teal-700 hover:underline text-left">
            {employee.name}
          </button>
          <p className="text-xs text-slate-500">{employee.employee_id}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {employee.position || "—"}
        {employee.employment_type && employee.employment_type !== "regular" && (
          <Badge variant="secondary" className="ml-1 text-xs">{employee.employment_type}</Badge>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{employee.department || "—"}</td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {employee.email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" />{employee.email}</p>}
        {employee.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{employee.phone}</p>}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{employee.hire_date || "—"}</td>
      <td className="px-4 py-3 text-sm text-slate-600">
        {(employee.salary_type === "hourly" || employee.salary_type === "both") && employee.hourly_rate
          ? <p>EGP {employee.hourly_rate}/hr</p> : null}
        {(employee.salary_type === "fixed" || employee.salary_type === "both") && employee.fixed_salary
          ? <p>EGP {employee.fixed_salary}/mo</p> : null}
      </td>
      <td className="px-3 py-3">
        <EmployeeInviteControl
          employee={employee}
          isRegistered={isRegistered(employee)}
          role={roleFor(employee)}
        />
      </td>
      <td className="px-3 py-3">
        {canEdit && (!isSystemAccount(employee) || isCentral) && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => handleOpen(employee)}>
              <Pencil className="w-3 h-3" />
            </Button>
            {roleFor(employee) && !isSelf(employee) && !access[employee.id]?.is_safety_valve && (
              <RemoveAccessButton employee={employee} />
            )}
            {!isSelf(employee) && !access[employee.id]?.is_safety_valve && (
              <DeleteEmployeeButton
                employee={employee}
                onConfirm={() => deleteMutation.mutate(employee)}
                disabled={deleteMutation.isPending}
              />
            )}
          </div>
        )}
      </td>
    </tr>
  );

  const EmployeeTable = ({ list }) => (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Name / ID</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Position</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Department</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Contact</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Hire Date</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Salary</th>
            <th className="px-3 py-3 text-left font-semibold text-slate-700">Access</th>
            <th className="px-3 py-3 text-left font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {list.length === 0
            ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No employees found</td></tr>
            : groupEmployees(list, groupBy, filterHelpers).map(g => (
              <Fragment key={g.label || "all"}>
                {g.label && (
                  <tr className="bg-slate-100 border-b">
                    <td colSpan={8} className="px-4 py-2 text-sm font-semibold text-slate-700">{g.label} ({g.items.length})</td>
                  </tr>
                )}
                {g.items.map(emp => <EmployeeRow key={emp.id} employee={emp} />)}
              </Fragment>
            ))
          }
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Employees ({activeEmployees.length})
        </h3>
        <div className="flex items-center gap-2">
          <EmployeeFilterPopover
            filters={filters} setFilters={setFilters} groupBy={groupBy} setGroupBy={setGroupBy}
            departments={departmentOptions} roles={roleOptions}
          />
          {canEdit && (
            <Button onClick={() => handleOpen()} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Employee
            </Button>
          )}
        </div>
      </div>

      <EmployeeSearchBar value={filters.search} onChange={(search) => setFilters((f) => ({ ...f, search }))} />

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active ({activeEmployees.length})</TabsTrigger>
          <TabsTrigger value="inactive">Other ({inactiveEmployees.length})</TabsTrigger>
          <TabsTrigger value="ex">Ex-Employees</TabsTrigger>
        </TabsList>

        <TabsContent value="ex" className="mt-4">
          <ExEmployeesTable canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <EmployeeTable list={activeEmployees} />
        </TabsContent>

        <TabsContent value="inactive" className="mt-4">
          <EmployeeTable list={inactiveEmployees} />
        </TabsContent>
      </Tabs>

      <EmployeeProfileDialog
        employee={employees.find((e) => e.id === profileEmployeeId) || null}
        role={profileEmployeeId ? access[profileEmployeeId]?.role : ""}
        onClose={() => setProfileEmployeeId(null)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select from Users</Label>
              <div className="relative">
                <button
                  onClick={() => setShowUserSelector(!showUserSelector)}
                  className="w-full px-3 py-2 border rounded-lg text-sm text-left flex items-center justify-between hover:bg-slate-50"
                >
                  <span className="text-slate-500">Search users by name, email...</span>
                  <Search className="w-4 h-4" />
                </button>
                {showUserSelector && (
                  <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg bg-white shadow-lg z-50">
                    <Input
                      type="text"
                      placeholder="Search name or email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="border-0 border-b rounded-none"
                      autoFocus
                    />
                    <div className="max-h-48 overflow-y-auto">
                      {filteredUsers.length === 0 ? (
                        <p className="p-3 text-sm text-slate-500">No users found</p>
                      ) : (
                        filteredUsers.map(user => (
                          <button
                            key={user.id}
                            onClick={() => handleSelectUser(user)}
                            className="w-full px-3 py-2 text-left hover:bg-slate-100 border-b text-sm"
                          >
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <Label>Employee ID</Label>
                <Input value={formData.employee_id} readOnly disabled />
                <p className="text-xs text-slate-500 mt-1">Auto-generated</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Department</Label>
                <OptionSelectWithAdd
                  value={formData.department}
                  onChange={(v) => setFormData({ ...formData, department: v })}
                  options={departmentOptions}
                  placeholder="Select department..."
                />
              </div>
              <EmployeeRoleField
                value={formData.role}
                onChange={(v) => setFormData({ ...formData, role: v })}
                department={formData.department}
                canAssignPrivileged={isCentral}
                disabled={!!roleLockReason}
                lockedReason={roleLockReason}
              />
            </div>

            {editingEmployee && (
              <EmployeeBranchField
                value={formData.branch_id}
                onChange={(v) => setFormData({ ...formData, branch_id: v })}
                disabled={!!roleLockReason}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Employment Type</Label>
                <select
                  value={formData.employment_type}
                  onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="regular">Regular (monthly payroll)</option>
                  <option value="temporary">Temporary</option>
                  <option value="freelance">Freelance / per event</option>
                  {(isCentral || formData.employment_type === "system_account") && (
                    <option value="system_account">System account (no payroll / attendance)</option>
                  )}
                </select>
              </div>
              <div>
                <Label>Skills / Certifications (comma separated)</Label>
                <Input
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder="food handling certificate, mixology, large event service"
                />
              </div>
            </div>

            <div>
              <Label>Hire Date</Label>
              <Input type="date" value={formData.hire_date} onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })} />
            </div>

            <div>
              <Label>Salary Type</Label>
              <select
                value={formData.salary_type}
                onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="hourly">Hourly</option>
                <option value="fixed">Fixed Monthly</option>
                <option value="both">Both (Hourly + Fixed)</option>
              </select>
            </div>

            {(formData.salary_type === "hourly" || formData.salary_type === "both") && (
              <>
                <div>
                  <Label>Monthly Salary (EGP) - Auto-calculates hourly rate</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      step="0.01"
                      value={formData.calculate_from_monthly} 
                      onChange={(e) => setFormData({ ...formData, calculate_from_monthly: e.target.value })} 
                      placeholder="Enter monthly salary to auto-calculate"
                    />
                    {formData.calculate_from_monthly && (
                      <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 whitespace-nowrap">
                        EGP {(parseFloat(formData.calculate_from_monthly) / 240).toFixed(2)}/hr
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Calculates as: monthly ÷ (30 days × 8 hours)</p>
                </div>
                <div>
                  <Label>Or Set Hourly Rate Directly (EGP)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={formData.hourly_rate} 
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })} 
                    placeholder="Direct hourly rate"
                  />
                </div>
              </>
            )}

            {(formData.salary_type === "fixed" || formData.salary_type === "both") && (
              <div>
                <Label>Fixed Monthly Salary (EGP)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={formData.fixed_salary} 
                  onChange={(e) => setFormData({ ...formData, fixed_salary: e.target.value })} 
                />
              </div>
            )}

            <EmployeeFaceCapture 
              existingFaceData={formData.face_scan_data}
              onCapture={(imageData) => setFormData({ ...formData, face_scan_data: imageData })}
            />

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingEmployee ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}