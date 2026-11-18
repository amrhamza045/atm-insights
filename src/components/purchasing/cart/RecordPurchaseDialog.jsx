import React, { useEffect, useState } from "react";
import { NumberInput } from "@/components/ui/input";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, PackageCheck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { overBy, OverReceiptLine, OverReceiptConfirm } from "@/components/purchasing/OverReceiptWarning";
import { savePurchaseOrderLines, recordRealPurchase, receivableLines } from "./recordPurchase";
import { companyToday } from "@/components/utils/timezoneHelper";

/**
 * Completion is deliberately two steps: first the buyer records what was really
 * bought onto the order (nothing else happens), then a separate action generates
 * the invoice that actually moves stock. That keeps a checkpoint between editing
 * and committing inventory.
 */
export default function RecordPurchaseDialog({ order, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();
  const [received, setReceived] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [overConfirmed, setOverConfirmed] = useState(false);
  const [receiptConfirmed, setReceiptConfirmed] = useState(false);

  useEffect(() => {
    setReceived({});
    setDirty(false);
    setOverConfirmed(false);
    setReceiptConfirmed(Boolean(order?.receipt_confirmed_at));
  }, [order?.id, order?.receipt_confirmed_at, open]);

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["allInventoryItems", selectedBranchId],
    queryFn: async () => {
      const items = await base44.entities.InventoryItem.filter(
        selectedBranchId ? { branch_id: selectedBranchId } : {},
        "-created_date",
        1000
      );
      return items.filter((i) => !selectedBranchId || i.branch_id === selectedBranchId);
    },
  });

  if (!order) return null;

  const lines = receivableLines(order);
  const valueOf = (line, field) => received[line.inventory_item_id]?.[field] ?? line[field === "quantity" ? "quantity_ordered" : "unit_price"];
  const expiryOf = (line) => received[line.inventory_item_id]?.expiry_date || "";
  const isDropped = (line) => !!received[line.inventory_item_id]?.dropped;

  const patch = (id, p) => {
    setReceived((prev) => ({ ...prev, [id]: { ...prev[id], ...p } }));
    setDirty(true);
    setReceiptConfirmed(false);
  };

  const overCount = lines.filter((l) => !isDropped(l) && overBy(valueOf(l, "quantity"), l.quantity_ordered)).length;
  const overBlocked = overCount > 0 && !overConfirmed;

  const total = lines
    .filter((l) => !isDropped(l))
    .reduce((s, l) => s + (Number(valueOf(l, "quantity")) || 0) * (Number(valueOf(l, "unit_price")) || 0), 0);

  const hasPastExpiry = () => {
    const today = companyToday();
    const bad = lines.some((line) => !isDropped(line) && expiryOf(line) && expiryOf(line) < today);
    if (bad) toast.error("An expiry date is in the past — expired products can't be received");
    return bad;
  };

  const save = async () => {
    if (hasPastExpiry()) return;
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      await savePurchaseOrderLines({ order, received, userEmail: user?.email });
      await queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      setDirty(false);
      setReceiptConfirmed(true);
      toast.success("Received quantities and pricing confirmed — ready to generate Draft Invoice");
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.data?.error || err?.message || "Could not save the order");
    } finally {
      setSaving(false);
    }
  };

  const record = async () => {
    if (hasPastExpiry()) return;
    setRecording(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      const res = await recordRealPurchase({
        order,
        received,
        inventoryItems,
        branch: selectedBranch,
        userEmail: user?.email,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] }),
        queryClient.invalidateQueries({ queryKey: ["allInventoryItems"] }),
        queryClient.invalidateQueries({ queryKey: ["inventoryItems"] }),
        queryClient.invalidateQueries({ queryKey: ["purchaseInvoices"] }),
        queryClient.invalidateQueries({ queryKey: ["expiryReports"] }),
        queryClient.invalidateQueries({ queryKey: ["event-cart-orders"] }),
      ]);
      toast.success("Purchase recorded — invoice saved as Draft for a manager to post");
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.data?.error || err?.message || "Could not record the purchase");
    } finally {
      setRecording(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record purchase — {order.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 space-y-1">
            <p>
              <strong>Step 1:</strong> Verify the pricing and confirm the quantities actually received.
            </p>
            <p>
              <strong>Step 2:</strong> Create the Draft Purchase Invoice from the confirmed receipt, then post it in Purchase Invoices to update stock and accounting.
            </p>
          </div>

          <div className="space-y-2">
            {lines.map((line) => {
              const dropped = isDropped(line);
              const stockUnit = line.purchase_unit_label || line.unit || "";
              return (
                <div
                  key={line.inventory_item_id}
                  className={`p-3 rounded-lg border ${dropped ? "border-red-200 bg-red-50 opacity-70" : "border-slate-200 bg-white"}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{line.inventory_item_name}</p>
                      <p className="text-xs text-slate-500">
                        Ordered {line.quantity_ordered} {line.purchase_unit_label || line.unit} · stocked as {line.selling_unit_label || line.unit}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => patch(line.inventory_item_id, { dropped: !dropped })}
                      className={dropped ? "text-slate-600" : "text-red-600"}
                    >
                      {dropped ? <Undo2 className="w-3.5 h-3.5" /> : "Not bought"}
                    </Button>
                  </div>

                  {!dropped && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Received ({stockUnit})</p>
                        <NumberInput
                          type="number"
                          min="0"
                          step="0.01"
                          value={valueOf(line, "quantity")}
                          onChange={(e) => { patch(line.inventory_item_id, { quantity: parseFloat(e.target.value) || 0 }); setOverConfirmed(false); }}
                          className={`w-full h-8 px-2 border rounded text-sm ${overBy(valueOf(line, "quantity"), line.quantity_ordered) ? "border-amber-400 bg-amber-50" : "border-slate-300"}`}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Real unit price</p>
                        <NumberInput
                          type="number"
                          min="0"
                          step="0.01"
                          value={valueOf(line, "unit_price")}
                          onChange={(e) => patch(line.inventory_item_id, { unit_price: parseFloat(e.target.value) || 0 })}
                          className="w-full h-8 px-2 border border-slate-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Expiry date (optional)</p>
                        <input
                          type="date"
                          min={companyToday()}
                          value={expiryOf(line)}
                          onChange={(e) => patch(line.inventory_item_id, { expiry_date: e.target.value })}
                          className="w-full h-8 px-2 border border-slate-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Line total</p>
                        <div className="h-8 px-2 flex items-center rounded border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700">
                          {formatCurrency(
                            (Number(valueOf(line, "quantity")) || 0) * (Number(valueOf(line, "unit_price")) || 0)
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {!dropped && <OverReceiptLine received={valueOf(line, "quantity")} ordered={line.quantity_ordered} unit={stockUnit} />}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-sm text-slate-600 mr-2">Invoice total:</span>
            <span className="text-lg font-bold text-amber-700">{formatCurrency(total)}</span>
          </div>

          <OverReceiptConfirm count={overCount} checked={overConfirmed} onChange={setOverConfirmed} />

          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t">
            {dirty && <Badge className="bg-orange-100 text-orange-700 border-orange-200 self-center mr-auto">Unsaved edits</Badge>}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button
              variant={receiptConfirmed && !dirty ? "outline" : "default"}
              onClick={save}
              disabled={saving || overBlocked || !lines.some((l) => !isDropped(l))}
              className="gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saving ? "Confirming..." : receiptConfirmed && !dirty ? "Amounts Confirmed ✓" : "1. Confirm Received Amounts & Prices"}
            </Button>
            <Button
              onClick={record}
              disabled={recording || dirty || !receiptConfirmed || overBlocked || !lines.some((l) => !isDropped(l))}
              title={!receiptConfirmed || dirty ? "Confirm received amounts & prices first" : "Create draft purchase invoice from confirmed receipt"}
              className="gap-1.5 bg-green-600 hover:bg-green-700"
            >
              <PackageCheck className="w-4 h-4" />
              {recording ? "Recording..." : "2. Record Purchase & Create Invoice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}