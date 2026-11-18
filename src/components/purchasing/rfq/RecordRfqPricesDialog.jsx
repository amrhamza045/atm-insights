import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileCheck2, Save } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { round2 } from "@/components/catering/cateringLogic";
import { roundQty } from "@/lib/unitConversion";

export default function RecordRfqPricesDialog({
  order,
  open,
  onOpenChange,
  onSaveDraftQuotes,
  onConvertToPo,
  isPending,
}) {
  const [lines, setLines] = useState([]);
  const [verified, setVerified] = useState(false);
  const [quoteNotes, setQuoteNotes] = useState("");

  useEffect(() => {
    if (!order) return;
    setLines(
      (order.items || []).map((item) => ({
        ...item,
        quantity_ordered: Number(item.quantity_ordered) || 0,
        unit_price: Number(item.unit_price) > 0 ? Number(item.unit_price) : "",
      }))
    );
    setVerified(false);
    setQuoteNotes(order.notes || "");
  }, [order, open]);

  if (!order) return null;

  const updateLine = (idx, patch) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const next = { ...l, ...patch };
        const qty = Number(next.quantity_ordered) || 0;
        const price = Number(next.unit_price) || 0;
        next.total_price = round2(qty * price);
        return next;
      })
    );
    setVerified(false);
  };

  const activeLines = lines.filter((l) => (Number(l.quantity_ordered) || 0) > 0);
  const allPriced =
    activeLines.length > 0 &&
    activeLines.every((l) => l.unit_price !== "" && Number(l.unit_price) > 0);
  const totalAmount = round2(
    activeLines.reduce(
      (sum, l) => sum + (Number(l.quantity_ordered) || 0) * (Number(l.unit_price) || 0),
      0
    )
  );

  const buildSanitizedItems = () =>
    activeLines.map((l) => {
      const qty = roundQty(Number(l.quantity_ordered) || 0, 4);
      const price = roundQty(Number(l.unit_price) || 0);
      return {
        ...l,
        quantity_ordered: qty,
        unit_price: price,
        base_unit_price: price,
        total_price: round2(qty * price),
        approval_status: "pending",
      };
    });

  const handleSaveDraft = () => {
    if (activeLines.length === 0) {
      toast.error("Keep at least one item with a quantity above zero");
      return;
    }
    onSaveDraftQuotes({
      order,
      items: buildSanitizedItems(),
      totalAmount,
      notes: quoteNotes,
    });
  };

  const handleConvert = () => {
    if (!allPriced) {
      toast.error("Enter the supplier's quoted unit price (> 0) for every requested item");
      return;
    }
    if (!verified) {
      toast.error("Please verify the quoted prices and quantities before converting to a PO");
      return;
    }
    onConvertToPo({
      order,
      items: buildSanitizedItems(),
      totalAmount,
      notes: quoteNotes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>Record RFQ Prices & Convert to PO — {order.order_number}</DialogTitle>
            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">RFQ</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 space-y-1">
            <p className="font-semibold">Supplier: {order.supplier}</p>
            <p>
              Enter the unit prices quoted by the supplier and verify the requested quantities. Converting turns this RFQ into a Purchase Order ready for approval and purchase recording.
            </p>
          </div>

          <div className="space-y-2">
            {lines.map((line, idx) => {
              const unitLabel = line.purchase_unit_label || line.unit || "pcs";
              const lineTotal = round2(
                (Number(line.quantity_ordered) || 0) * (Number(line.unit_price) || 0)
              );
              const missingPrice =
                (Number(line.quantity_ordered) || 0) > 0 &&
                (line.unit_price === "" || Number(line.unit_price) <= 0);

              return (
                <div
                  key={line.inventory_item_id || idx}
                  className="p-3 rounded-lg border border-slate-200 bg-white space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-slate-900">{line.inventory_item_name}</p>
                      <p className="text-xs text-slate-500">
                        Unit: {unitLabel}
                        {line.system_stock != null ? ` · System stock: ${line.system_stock} ${line.selling_unit_label || unitLabel}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-amber-700">
                      {formatCurrency(lineTotal)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-600">Requested / Verified Qty ({unitLabel})</Label>
                      <NumberInput
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.quantity_ordered}
                        onChange={(e) =>
                          updateLine(idx, { quantity_ordered: parseFloat(e.target.value) || 0 })
                        }
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">
                        Supplier Quoted Unit Price (EGP/{unitLabel}) *
                      </Label>
                      <NumberInput
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unit_price}
                        placeholder="Enter quoted price..."
                        onChange={(e) =>
                          updateLine(idx, {
                            unit_price: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                          })
                        }
                        className={`mt-1 h-8 text-sm ${
                          missingPrice ? "border-amber-400 bg-amber-50/40" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <Label className="text-xs">Supplier Quote Reference / Notes</Label>
            <Textarea
              rows={2}
              value={quoteNotes}
              onChange={(e) => setQuoteNotes(e.target.value)}
              placeholder="Quote reference, delivery terms, or pricing notes..."
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-sm text-slate-700 font-medium">Quoted Order Total:</span>
            <span className="text-lg font-bold text-amber-700">{formatCurrency(totalAmount)}</span>
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
            <Checkbox
              checked={verified}
              onCheckedChange={(v) => setVerified(Boolean(v))}
              className="mt-0.5"
            />
            <span className="text-xs text-slate-700">
              I have verified the supplier's quoted prices and quantities for all {activeLines.length} item(s) and confirm converting this RFQ into a Purchase Order.
            </span>
          </label>

          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isPending || activeLines.length === 0}
              className="gap-1.5"
            >
              <Save className="w-4 h-4" />
              Save Quoted Prices (Keep as RFQ)
            </Button>
            <Button
              onClick={handleConvert}
              disabled={isPending || !allPriced || !verified}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <FileCheck2 className="w-4 h-4" />
              {isPending ? "Converting..." : "Convert RFQ to PO"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}