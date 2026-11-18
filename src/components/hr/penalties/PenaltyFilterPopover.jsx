import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";
import { EMPTY_PEN_FILTERS, PEN_GROUP_OPTIONS, activePenCount } from "./penaltyFilters";

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

export default function PenaltyFilterPopover({ filters, setFilters, groupBy, setGroupBy, types }) {
  const set = (k) => (v) => setFilters({ ...filters, [k]: v });
  const count = activePenCount(filters) + (groupBy !== "none" ? 1 : 0);

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
          <Input value={filters.search} onChange={(e) => set("search")(e.target.value)} placeholder="Employee or description" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Sel label="Penalty type" value={filters.type} onChange={set("type")}>
            <option value="all">All</option>
            {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Sel>
          <Sel label="Status" value={filters.status} onChange={set("status")}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="applied">Applied</option>
            <option value="cancelled">Cancelled</option>
          </Sel>
          <div>
            <Label className="text-xs">Min amount</Label>
            <Input type="number" value={filters.minAmount} onChange={(e) => set("minAmount")(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Max amount</Label>
            <Input type="number" value={filters.maxAmount} onChange={(e) => set("maxAmount")(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Incident from</Label>
            <Input type="date" value={filters.incidentFrom} onChange={(e) => set("incidentFrom")(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Incident to</Label>
            <Input type="date" value={filters.incidentTo} onChange={(e) => set("incidentTo")(e.target.value)} />
          </div>
        </div>
        <Sel label="Group by" value={groupBy} onChange={setGroupBy}>
          {PEN_GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Sel>
        <Button variant="ghost" size="sm" onClick={() => { setFilters(EMPTY_PEN_FILTERS); setGroupBy("none"); }}>
          Clear all
        </Button>
      </PopoverContent>
    </Popover>
  );
}