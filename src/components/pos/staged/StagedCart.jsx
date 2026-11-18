import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Plus, Minus, Trash2, Send, Loader2 } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function StagedCart({
  items,
  subtotal,
  extraFeeLabel,
  extraFee = 0,
  onChangeQty,
  onRemove,
  onComment,
  onSubmit,
  submitting,
  submitLabel = "Send to Cashier",
  disabled,
  accent = "emerald",
  children
}) {
  const accentClass = accent === "blue" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700";
  return (
    <Card className="lg:sticky lg:top-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          Order ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {children}

        {items.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No items added yet</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {items.map((i) => (
              <div key={i.menu_item_id} className="p-2.5 rounded bg-slate-50 space-y-1.5">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm break-words">{i.name}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(i.price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => onChangeQty(i.menu_item_id, -1)} className="h-8 w-8 p-0"><Minus className="w-3.5 h-3.5" /></Button>
                    <span className="w-8 text-center text-sm font-medium">{i.quantity}</span>
                    <Button size="sm" variant="outline" onClick={() => onChangeQty(i.menu_item_id, 1)} className="h-8 w-8 p-0"><Plus className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => onRemove(i.menu_item_id)} className="h-8 w-8 p-0"><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                  </div>
                </div>
                <Input value={i.comment || ""} onChange={(e) => onComment(i.menu_item_id, e.target.value)} placeholder="Item note (optional)" className="h-8 text-xs" />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 pt-3 border-t">
          <div className="flex justify-between text-sm">
            <span>Items Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {extraFee > 0 && (
            <div className="flex justify-between text-sm">
              <span>{extraFeeLabel}</span>
              <span>{formatCurrency(extraFee)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg">
            <span>Estimated Total</span>
            <span>{formatCurrency(subtotal + extraFee)}</span>
          </div>
          <p className="text-xs text-slate-500">Tax, service and discounts are applied by the cashier on approval.</p>
        </div>

        <Button onClick={onSubmit} disabled={submitting || disabled} className={`w-full gap-2 ${accentClass}`}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitLabel}
        </Button>
      </CardContent>
    </Card>
  );
}