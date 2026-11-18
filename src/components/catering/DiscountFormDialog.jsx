import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { computeQuoteTotals, round2 } from "./cateringLogic";

export default function DiscountFormDialog({ quote, open, onOpenChange, onSave, saving }) {
  const [mode, setMode] = useState("amount");
  const [value, setValue] = useState(String(quote?.discount_amount || 0));
  const [reason, setReason] = useState("");

  if (!quote) return null;

  const base = round2((Number(quote.subtotal) || 0) + (Number(quote.tax_total) || 0) + (Number(quote.service_charge_total) || 0));
  const discount = mode === "percent"
    ? round2((base * (Number(value) || 0)) / 100)
    : round2(Number(value) || 0);
  const preview = computeQuoteTotals(
    quote.line_items || [],
    quote.tax_rate,
    quote.service_charge_rate,
    discount,
    quote.deposit_percentage
  );
  const tooBig = discount > base;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Discount — {quote.event_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-slate-500">
            Gross before discount: <span className="font-semibold text-slate-900">{formatCurrency(base)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Type</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Fixed amount (EGP)</SelectItem>
                  <SelectItem value="percent">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value</Label>
              <Input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this discount is granted" rows={2} />
          </div>

          <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Discount</span><span className="font-semibold">{formatCurrency(discount)}</span></div>
            <div className="flex justify-between"><span>New total</span><span className="font-semibold">{formatCurrency(preview.total)}</span></div>
            <div className="flex justify-between"><span>New required deposit</span><span>{formatCurrency(preview.required_deposit)}</span></div>
            <div className="flex justify-between"><span>Margin after discount</span><span>{formatCurrency(preview.estimated_margin)}</span></div>
          </div>

          {tooBig && <p className="text-sm text-red-600">Discount cannot exceed the gross amount.</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={saving || tooBig}
            onClick={() => onSave({ discount, reason, mode, value: Number(value) || 0 })}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {saving ? "Saving…" : "Apply discount"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}