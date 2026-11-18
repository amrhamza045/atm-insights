import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Send } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import CaptainCartLine from "./CaptainCartLine";

export default function CaptainCartCard({
  cart, selectedTable, subtotal, tax, service, taxPercentage, servicePercentage, total,
  guestCount, onGuestCount, notes, onNotes,
  onQty, onRemove, onComment, onSubmit, submitting,
  pendingBanner, isAppending = false
}) {
  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Cart ({cart.length})
          </CardTitle>
          {selectedTable && <Badge className="bg-green-600">Table {selectedTable.table_number}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingBanner}
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min="0" value={guestCount} onChange={(e) => onGuestCount(e.target.value)} placeholder="Guests" className="h-9 text-sm" />
          <Input value={notes} onChange={(e) => onNotes(e.target.value)} placeholder="Order notes" className="h-9 text-sm" />
        </div>

        {cart.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">Cart is empty</p>
        ) : (
          <>
            {cart.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cart.map(item => (
                  <CaptainCartLine key={item._cartKey} item={item} onQty={onQty} onRemove={onRemove} onComment={onComment} />
                ))}
              </div>
            )}

            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {servicePercentage > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Service ({(servicePercentage * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(service)}</span>
                </div>
              )}
              {taxPercentage > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax ({(taxPercentage * 100).toFixed(0)}%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg">
                <span>Estimated Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <Button
              onClick={onSubmit}
              disabled={submitting || !selectedTable || cart.length === 0}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="w-4 h-4" />
              {submitting ? "Sending..." : !selectedTable ? "Select a Table" : isAppending ? "Add Items to Pending Order" : "Send to Cashier for Approval"}
            </Button>
            <p className="text-xs text-slate-500 text-center">
              {isAppending
                ? "These items join the table's pending order awaiting cashier approval."
                : "The cashier reviews and approves this order before payment."}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}