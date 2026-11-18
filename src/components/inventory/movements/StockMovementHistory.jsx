import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import MovementRow from "./MovementRow";

export default function StockMovementHistory({ item }) {
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["inventoryMovements", item.id],
    queryFn: () => base44.entities.InventoryMovement.filter({ inventory_item_id: item.id }, "-occurred_at", 200),
  });
  const costUnit = item.purchase_unit_label || (item.purchase_unit === "weight" ? "kg" : "pcs");

  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs text-slate-500">
        Average cost: <span className="font-semibold text-slate-800">{item.cost_per_unit ? `${formatCurrency(item.cost_per_unit)} / ${costUnit}` : "—"}</span>
        <span className="ml-2 text-slate-400">(average of purchase invoices, or the entered cost until there are purchases)</span>
      </p>
      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" />Loading stock movements…</div>
      ) : movements.length === 0 ? (
        <p className="py-4 text-sm text-slate-400 text-center">No stock movements recorded for this item yet.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b text-left text-slate-500">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Movement</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2 text-right">Quantity</th>
                <th className="px-3 py-2 text-right">Balance after</th>
                <th className="px-3 py-2 text-right">Cost impact</th>
                <th className="px-3 py-2">By</th>
              </tr>
            </thead>
            <tbody>{movements.map((m) => <MovementRow key={m.id} m={m} />)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}