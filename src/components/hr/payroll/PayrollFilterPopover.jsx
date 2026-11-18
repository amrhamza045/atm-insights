import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";
import { EMPTY_PAY_FILTERS, PAY_GROUP_OPTIONS, activePayCount } from "./payrollFilters";

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

const uniq = (list, k) => [...new Set(list.map((e) => e[k]).filter(Boolean))].sort();

export default function PayrollFilterPopover({ filters, setFilters, groupBy, setGroupBy, employees }) {
  const set = (k) => (v) => setFilters({ ...filters, [k]: v });
  const count = activePayCount(filters) + (groupBy !== "none" ? 1 : 0);

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
          <Label className="text-xs">Search</Label>
          <Input value={filters.search} onChange={(e) => set("search")(e.target.value)} placeholder="Employee or position" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Sel label="Payment status" value={filters.payStatus} onChange={set("payStatus")}>
            <option value="all">All</option>
            <option value="not run">Not run</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </Sel>
          <Sel label="Salary type" value={filters.salaryType} onChange={set("salaryType")}>
            <option value="all">All</option>
            <option value="fixed">Fixed</option>
            <option value="hourly">Hourly</option>
            <option value="both">Both</option>
          </Sel>
          <Sel label="Department" value={filters.department} onChange={set("department")}>
            <option value="all">All</option>
            {uniq(employees, "department").map((v) => <option key={v} value={v}>{v}</option>)}
          </Sel>
          <Sel label="Position" value={filters.position} onChange={set("position")}>
            <option value="all">All</option>
            {uniq(employees, "position").map((v) => <option key={v} value={v}>{v}</option>)}
          </Sel>
          <Sel label="Adjustments" value={filters.deductions} onChange={set("deductions")}>
            <option value="all">All</option>
            <option value="penalties">Has penalties</option>
            <option value="borrowing">Has borrowing deduction</option>
            <option value="bonus">Has bonus</option>
          </Sel>
          <div />
          <div>
            <Label className="text-xs">Min net</Label>
            <Input type="number" value={filters.minNet} onChange={(e) => set("minNet")(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Max net</Label>
            <Input type="number" value={filters.maxNet} onChange={(e) => set("maxNet")(e.target.value)} />
          </div>
        </div>
        <Sel label="Group by" value={groupBy} onChange={setGroupBy}>
          {PAY_GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Sel>
        <Button variant="ghost" size="sm" onClick={() => { setFilters(EMPTY_PAY_FILTERS); setGroupBy("none"); }}>
          Clear all
        </Button>
      </PopoverContent>
    </Popover>
  );
}