import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = ["all", "food", "beverage", "raw_material", "packaging", "other"];
const DISPOSITIONS = ["all", "pending", "returned_to_stock", "staff_meal", "wasted"];
const CONDITIONS = ["all", "reusable", "damaged", "spoiled"];

const label = (v) => (v === "all" ? "All" : v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()));

export default function ReturnedFilters({ filter, onChange, events = [] }) {
  const set = (patch) => onChange({ ...filter, ...patch });
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <p className="text-xs text-slate-500 mb-1">Category</p>
        <Select value={filter.category} onValueChange={(v) => set({ category: v })}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{label(c)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Disposition</p>
        <Select value={filter.disposition} onValueChange={(v) => set({ disposition: v })}>
          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DISPOSITIONS.map((d) => <SelectItem key={d} value={d}>{label(d)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Condition</p>
        <Select value={filter.condition} onValueChange={(v) => set({ condition: v })}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{label(c)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-1">Event</p>
        <Select value={filter.event} onValueChange={(v) => set({ event: v })}>
          <SelectTrigger className="h-9 w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All events</SelectItem>
            {events.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 min-w-[180px]">
        <p className="text-xs text-slate-500 mb-1">Search</p>
        <Input className="h-9" placeholder="Item or event…" value={filter.search} onChange={(e) => set({ search: e.target.value })} />
      </div>
    </div>
  );
}