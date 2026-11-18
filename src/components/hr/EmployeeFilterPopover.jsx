import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";
import { EMPTY_FILTERS, GROUP_OPTIONS, activeFilterCount } from "./employeeFilters";

const selectCls = "w-full px-3 py-2 border rounded-lg text-sm bg-white";

function Sel({ label, value, onChange, children }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>{children}</select>
    </div>
  );
}

export default function EmployeeFilterPopover({ filters, setFilters, groupBy, setGroupBy, departments, roles }) {
  const set = (k) => (v) => setFilters({ ...filters, [k]: v });
  const count = activeFilterCount(filters) + (groupBy !== "none" ? 1 : 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
          {count > 0 && <span className="rounded-full bg-slate-900 text-white text-xs px-1.5">{count}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-h-[80vh] overflow-y-auto space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Sel label="Department" value={filters.department} onChange={set("department")}>
            <option value="all">All</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </Sel>
          <Sel label="Role" value={filters.role} onChange={set("role")}>
            <option value="all">All</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </Sel>
          <Sel label="Employment type" value={filters.employment_type} onChange={set("employment_type")}>
            <option value="all">All</option>
            <option value="regular">Regular</option>
            <option value="temporary">Temporary</option>
            <option value="freelance">Freelance</option>
            <option value="system_account">System account</option>
          </Sel>
          <Sel label="Salary type" value={filters.salary_type} onChange={set("salary_type")}>
            <option value="all">All</option>
            <option value="hourly">Hourly</option>
            <option value="fixed">Fixed</option>
            <option value="both">Both</option>
          </Sel>
          <Sel label="Access" value={filters.access} onChange={set("access")}>
            <option value="all">All</option>
            <option value="registered">Registered</option>
            <option value="invited">Invited — pending</option>
            <option value="none">No access</option>
          </Sel>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Hired from</Label>
            <Input type="date" value={filters.hireFrom} onChange={(e) => set("hireFrom")(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Hired to</Label>
            <Input type="date" value={filters.hireTo} onChange={(e) => set("hireTo")(e.target.value)} />
          </div>
        </div>
        <Sel label="Group by" value={groupBy} onChange={setGroupBy}>
          {GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Sel>
        <Button variant="ghost" size="sm" onClick={() => { setFilters(EMPTY_FILTERS); setGroupBy("none"); }}>
          Clear all
        </Button>
      </PopoverContent>
    </Popover>
  );
}