import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/components/utils/currencyFormatter";

/**
 * Supplier picker for one order line, comparing the options the underlying data
 * actually supports: last/average purchase price, how often they've supplied the
 * item, and the ratings already tracked on the Supplier record.
 */
export default function SupplierChoiceSelect({ options, value, onChange }) {
  if (options.length === 0) {
    return <p className="text-xs text-red-600">No supplier on record for this item — set one in Inventory.</p>;
  }

  return (
    <div className="space-y-1">
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Choose supplier" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.supplier_id} value={o.supplier_id} className="text-xs">
              {o.name}
              {o.is_preferred ? " · preferred" : ""}
              {o.last_price ? ` · ${formatCurrency(o.last_price)}` : ""}
              {o.rating ? ` · ${o.rating.toFixed(1)}★` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {options.length > 1 && (
        <div className="text-[11px] text-slate-500 space-y-0.5">
          {options.map((o) => (
            <p key={o.supplier_id} className={o.supplier_id === value ? "text-slate-700 font-medium" : ""}>
              {o.name}: {o.last_price ? formatCurrency(o.last_price) : "no price history"}
              {o.purchases ? ` · ${o.purchases} past order(s)` : ""}
              {o.delivery_performance ? ` · delivery ${o.delivery_performance.toFixed(1)}/5` : ""}
              {o.quality_rating ? ` · quality ${o.quality_rating.toFixed(1)}/5` : ""}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}