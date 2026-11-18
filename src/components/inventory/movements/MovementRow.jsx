import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { MOVEMENT_LABELS } from "./movementLabels";

export default function MovementRow({ m }) {
  const isIn = m.direction === "in";
  const Icon = isIn ? ArrowDownLeft : ArrowUpRight;
  const when = m.occurred_at || m.created_date;
  return (
    <tr className="border-b last:border-0 hover:bg-slate-50">
      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{when ? format(new Date(when), "MMM d, yyyy HH:mm") : "—"}</td>
      <td className="px-3 py-2">
        <span className={`inline-flex items-center gap-1 font-medium ${isIn ? "text-green-700" : "text-red-600"}`}>
          <Icon className="w-3 h-3" />{isIn ? "IN" : "OUT"}
        </span>
        <span className="ml-2 text-slate-600">{MOVEMENT_LABELS[m.movement_type] || m.movement_type}</span>
      </td>
      <td className="px-3 py-2 text-slate-600">
        {m.source_label || "—"}
        {m.event_name && <span className="block text-slate-400">Event: {m.event_name}</span>}
      </td>
      <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${isIn ? "text-green-700" : "text-red-600"}`}>
        {isIn ? "+" : "−"}{m.quantity} {m.unit}
      </td>
      <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">
        {m.quantity_after != null ? `${m.quantity_after} ${m.unit}` : "—"}
      </td>
      <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap">{m.cost_impact ? formatCurrency(m.cost_impact) : "—"}</td>
      <td className="px-3 py-2 text-slate-400">{m.actor_email || "—"}</td>
    </tr>
  );
}