import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";
import { EMPTY_ATT_FILTERS, ATT_GROUP_OPTIONS, activeAttCount } from "./attendanceFilters";

function Sel({ label, value, onChange, children }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
        {children}
      </select>
    </div>
  );
}

export default function AttendanceFilterPopover({ filters, setFilters, groupBy, setGroupBy, shifts, departments, positions }) {
  const set = (k) => (v) => setFilters({ ...filters, [k]: v });
  const count = activeAttCount(filters) + (groupBy !== "none" ? 1 : 0);
  const opts = (arr) => arr.map((v) => <option key={v} value={v}>{v}</option>);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" /> Filter
          {count > 0 && <span className="rounded-full bg-slate-900 text-white text-xs px-1.5">{count}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-h-[80vh] overflow-y-auto space-y-3">
        <div>
          <Label className="text-xs">Employee name</Label>
          <Input value={filters.search} onChange={(e) => set("search")(e.target.value)} placeholder="Search by name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Sel label="Review status" value={filters.review} onChange={set("review")}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="no_checkin">No check-in</option>
          </Sel>
          <Sel label="Attendance status" value={filters.status} onChange={set("status")}>
            <option value="all">All</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="no_show">No-show</option>
          </Sel>
          <Sel label="Shift" value={filters.shift} onChange={set("shift")}>
            <option value="all">All</option>
            <option value="none">No shift assigned</option>
            {opts(shifts)}
          </Sel>
          <Sel label="Salary type" value={filters.salary_type} onChange={set("salary_type")}>
            <option value="all">All</option>
            <option value="hourly">Hourly</option>
            <option value="fixed">Fixed</option>
            <option value="both">Both</option>
          </Sel>
          <Sel label="Department" value={filters.department} onChange={set("department")}>
            <option value="all">All</option>
            {opts(departments)}
          </Sel>
          <Sel label="Position" value={filters.position} onChange={set("position")}>
            <option value="all">All</option>
            {opts(positions)}
          </Sel>
        </div>
        <Sel label="Show only" value={filters.flag} onChange={set("flag")}>
          <option value="all">Everything</option>
          <option value="late">Late arrivals</option>
          <option value="overtime">With overtime</option>
          <option value="deduction">With deductions</option>
          <option value="no_signout">Not signed out</option>
        </Sel>
        <Sel label="Group by" value={groupBy} onChange={setGroupBy}>
          {ATT_GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Sel>
        <Button variant="ghost" size="sm" onClick={() => { setFilters(EMPTY_ATT_FILTERS); setGroupBy("none"); }}>
          Clear all
        </Button>
      </PopoverContent>
    </Popover>
  );
}