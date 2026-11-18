import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Building2, Search } from "lucide-react";
import { toast } from "sonner";
import DepartmentListItem from "./DepartmentListItem";
import DepartmentDetailPanel from "./DepartmentDetailPanel";
import AddDepartmentDialog from "./AddDepartmentDialog";
import { useDepartments } from "./useDepartments";

export default function DepartmentManager() {
  const queryClient = useQueryClient();
  const { departments } = useDepartments();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-all-departments"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const countByName = useMemo(() => {
    const map = {};
    employees.forEach((e) => {
      if (e.department) map[e.department] = (map[e.department] || 0) + 1;
    });
    return map;
  }, [employees]);

  const filtered = useMemo(
    () => departments.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())),
    [departments, search]
  );

  const selected = departments.find((d) => d.id === selectedId) || null;

  useEffect(() => {
    if (!selectedId && departments.length) setSelectedId(departments[0].id);
  }, [departments, selectedId]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["departments"] });

  const createMutation = useMutation({
    mutationFn: (name) => base44.entities.Department.create({ name, positions: [], user_roles: [], is_active: true }),
    onSuccess: (created) => {
      refresh();
      setSelectedId(created.id);
      setAddOpen(false);
      toast.success("Department created — now add its roles");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Department.update(id, data),
    onSuccess: () => {
      refresh();
      toast.success("Saved");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Department.delete(id),
    onSuccess: () => {
      refresh();
      setSelectedId(null);
      toast.success("Department deleted");
    },
  });

  const handleDelete = (dept) => {
    const count = countByName[dept.name] || 0;
    if (count > 0) {
      toast.error(`${count} employee(s) are still in ${dept.name} — mark it inactive instead`);
      return;
    }
    deleteMutation.mutate(dept.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Departments &amp; Roles ({departments.length})
          </h3>
          <p className="text-sm text-slate-500">Pick a department on the left to manage the roles inside it</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Department
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="p-2 border-b relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search departments"
              className="pl-8 h-9"
            />
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">No departments found</p>
            ) : (
              filtered.map((d) => (
                <DepartmentListItem
                  key={d.id}
                  department={d}
                  employeeCount={countByName[d.name] || 0}
                  selected={d.id === selectedId}
                  onSelect={(dept) => setSelectedId(dept.id)}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-5">
          {selected ? (
            <DepartmentDetailPanel
              department={selected}
              employeeCount={countByName[selected.name] || 0}
              onUpdate={(data) => updateMutation.mutate({ id: selected.id, data })}
              onDelete={handleDelete}
              saving={updateMutation.isPending}
            />
          ) : (
            <p className="text-center text-slate-400 py-12">Select a department to manage its roles</p>
          )}
        </div>
      </div>

      <AddDepartmentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreate={(name) => createMutation.mutate(name)}
        saving={createMutation.isPending}
      />
    </div>
  );
}