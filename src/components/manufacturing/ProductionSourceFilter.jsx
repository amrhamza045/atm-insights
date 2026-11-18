import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const PRODUCTION_SOURCES = [
  { value: "catering", label: "Catering production" },
  { value: "regular", label: "Regular production" },
  { value: "all", label: "All production" },
];

// Legacy rows written before order_source existed are treated as regular.
export function matchesSource(order, source) {
  if (source === "all") return true;
  return (order.order_source || "regular") === source;
}

export default function ProductionSourceFilter({ value, onChange }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRODUCTION_SOURCES.map((s) => (
          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}