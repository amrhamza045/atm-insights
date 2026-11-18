import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { cartTotal } from "./recommendedCart";
import CartLineRow from "./CartLineRow";

export default function CartSupplierGroup({ group, suppliers, reference, onChangeLine, onRemoveLine }) {
  const unassigned = !group.supplier_id;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{group.supplier_name}</p>
          {unassigned && (
            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Assign a supplier</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-500">{group.lines.length} line(s)</span>
          <span className="text-sm font-semibold text-slate-800">{formatCurrency(cartTotal(group.lines))}</span>
        </div>
      </div>

      <div className="space-y-2">
        {group.lines.map((line) => (
          <CartLineRow
            key={line.inventory_item_id}
            line={line}
            suppliers={suppliers}
            reference={reference}
            onChange={(patch) => onChangeLine(line.inventory_item_id, patch)}
            onRemove={() => onRemoveLine(line.inventory_item_id)}
          />
        ))}
      </div>
    </div>
  );
}