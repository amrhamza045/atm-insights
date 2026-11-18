import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";
import { EMPTY_BOR_FILTERS, BOR_GROUP_OPTIONS, activeBorCount } from "./borrowingFilters";

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

export default function BorrowingFilterPopover({ filters, setFilters, groupBy, setGroupBy }) {
  const set = (k) => (v) => setFilters({ ...filters, [k]: v });
  const count = activeBorCount(filters) + (groupBy !== "none" ? 1 : 0);

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
          <Input value={filters.search} onChange={(e) => set("search")(e.target.value)} placeholder="Employee or reason" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Sel label="Status" value={filters.status} onChange={set("status")}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Sel>
          <Sel label="Repayment type" value={filters.repayment} onChange={set("repayment")}>
            <option value="all">All</option>
            <option value="installments">Monthly installments</option>
            <option value="lump_sum">Lump sum</option>
          </Sel>
          <Sel label="Balance" value={filters.balance} onChange={set("balance")}>
            <option value="all">All</option>
            <option value="outstanding">Outstanding</option>
            <option value="cleared">Fully repaid</option>
          </Sel>
          <div />
          <div>
            <Label className="text-xs">Min amount</Label>
            <Input type="number" value={filters.minAmount} onChange={(e) => set("minAmount")(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Max amount</Label>
            <Input type="number" value={filters.maxAmount} onChange={(e) => set("maxAmount")(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Borrowed from</Label>
            <Input type="date" value={filters.borrowFrom} onChange={(e) => set("borrowFrom")(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Borrowed to</Label>
            <Input type="date" value={filters.borrowTo} onChange={(e) => set("borrowTo")(e.target.value)} />
          </div>
        </div>
        <Sel label="Group by" value={groupBy} onChange={setGroupBy}>
          {BOR_GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Sel>
        <Button variant="ghost" size="sm" onClick={() => { setFilters(EMPTY_BOR_FILTERS); setGroupBy("none"); }}>
          Clear all
        </Button>
      </PopoverContent>
    </Popover>
  );
}