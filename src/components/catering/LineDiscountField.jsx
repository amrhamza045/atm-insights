import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/components/utils/currencyFormatter";

/** Per-line discount (percent or fixed amount) for a quote line. */
export default function LineDiscountField({ line, computed, onChange }) {
  const amount = Number(computed?.discount_amount) || 0;
  return (
    <div>
      <Label className="text-xs">Line discount</Label>
      <div className="flex gap-1">
        <Input
          type="number"
          min="0"
          value={line.discount_value ?? 0}
          onChange={(e) => onChange({ discount_value: e.target.value })}
        />
        <Select value={line.discount_mode || "percent"} onValueChange={(v) => onChange({ discount_mode: v })}>
          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="percent">%</SelectItem>
            <SelectItem value="amount">EGP</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {amount > 0 && (
        <p className="text-xs text-emerald-700 mt-1">
          − {formatCurrency(amount, false)} · line {formatCurrency(Number(computed.line_total) || 0, false)}
        </p>
      )}
    </div>
  );
}