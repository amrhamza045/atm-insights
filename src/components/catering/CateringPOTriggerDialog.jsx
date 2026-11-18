import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { useBranch } from "@/components/branches/BranchContext";
import SupplierChoiceSelect from "./SupplierChoiceSelect";
import { supplierOptionsForItem, createCateringPurchaseOrders, resolveUrgency, toPurchaseQuantity } from "./procurement";

export default function CateringPOTriggerDialog({ open, onClose, event, trigger, lines, settings, onDone }) {
  const { selectedBranch } = useBranch();
  const [rows, setRows] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: refs } = useQuery({
    queryKey: ["po-trigger-refs"],
    queryFn: async () => {
      const [inventoryItems, suppliers, invoices, unitRules] = await Promise.all([
        base44.entities.InventoryItem.list("-created_date", 1000),
        base44.entities.Supplier.list("name"),
        base44.entities.PurchaseInvoice.list("-created_date", 200),
        base44.entities.UnitConversionRule.list("-created_date", 500).catch(() => []),
      ]);
      return { inventoryItems, suppliers, invoices, unitRules };
    },
    enabled: open,
  });

  const prepared = useMemo(() => {
    if (!refs) return [];
    return lines.map((l) => {
      const options = supplierOptionsForItem(l.inventory_item_id, refs);
      const item = refs.inventoryItems.find((i) => i.id === l.inventory_item_id);
      const pick = options[0];
      // The shortfall stays in the reservation's unit; the order is in the purchase unit.
      const buy = toPurchaseQuantity(l, item, refs.unitRules);
      return {
        ...l,
        options,
        shortfall: l.quantity,
        quantity: buy.quantity,
        conversion_failed: !buy.ok,
        supplier_id: pick?.supplier_id || "",
        supplier_name: pick?.name || "",
        supplier_contact: pick?.contact || "",
        unit_price: pick?.last_price || item?.cost_per_unit || 0,
        purchase_unit: item?.purchase_unit || "pcs",
        purchase_unit_label: buy.purchaseUnitLabel,
        selling_unit: item?.selling_unit || "pcs",
        selling_unit_label: item?.selling_unit_label || l.unit || "pcs",
        current_stock: item?.quantity ?? null,
      };
    });
  }, [refs, lines]);

  const data = rows || prepared;
  const urgency = resolveUrgency(event, settings);
  const total = data.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);

  const patch = (idx, changes) => {
    const next = [...data];
    next[idx] = { ...next[idx], ...changes };
    setRows(next);
  };

  const pickSupplier = (idx, supplierId) => {
    const row = data[idx];
    const opt = row.options.find((o) => o.supplier_id === supplierId);
    patch(idx, {
      supplier_id: supplierId,
      supplier_name: opt?.name || "",
      supplier_contact: opt?.contact || "",
      unit_price: opt?.last_price || row.unit_price,
    });
  };

  const submit = async () => {
    const usable = data.filter((r) => r.supplier_id && (Number(r.quantity) || 0) > 0);
    if (usable.length === 0) return toast.error("Add a quantity and supplier for at least one item");
    const unconverted = usable.find((r) => r.conversion_failed);
    if (unconverted) return toast.error(`Define a conversion from ${unconverted.unit} to ${unconverted.purchase_unit_label} for ${unconverted.inventory_item_name} before ordering it`);
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const res = await createCateringPurchaseOrders({
        event,
        lines: usable,
        trigger,
        branch: selectedBranch,
        userEmail: user?.email,
        settings,
        notes,
      });
      toast.success(`${res.created.length} purchase order(s) submitted for approval${res.urgency === "urgent" ? " — flagged urgent" : ""}`);
      onDone?.();
      onClose();
    } catch (e) {
      toast.error(e?.message || "Could not raise the purchase order(s)");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {trigger === "shortfall" ? "Order shortfall items" : "Plan-ahead order"} — {event?.event_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge className={urgency === "urgent" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}>
              {urgency === "urgent" ? "Urgent — event is imminent" : "Routine"}
            </Badge>
            <Badge variant="outline">Event date {event?.event_date}</Badge>
            <Badge variant="outline">Goes to the normal approval queue</Badge>
          </div>

          {!refs ? (
            <p className="text-sm text-slate-500">Loading suppliers and price history…</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing to order for this event.</p>
          ) : (
            <div className="space-y-2">
              {data.map((row, idx) => (
                <div key={row.inventory_item_id} className="rounded-lg border border-slate-200 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-slate-900">{row.inventory_item_name}</p>
                      <p className="text-xs text-slate-500">
                        {row.purposes?.includes("production_input") ? "production input" : "stock pull"}
                        {row.current_stock !== null ? ` · on hand ${row.current_stock} ${row.selling_unit_label}` : ""}
                        {row.demand != null ? ` · event demand ${row.demand} ${row.unit}` : ""}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-amber-700">
                      {formatCurrency((Number(row.quantity) || 0) * (Number(row.unit_price) || 0))}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Quantity ({row.purchase_unit_label})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8"
                        value={row.quantity}
                        onChange={(e) => patch(idx, { quantity: parseFloat(e.target.value) || 0 })}
                      />
                      {row.conversion_failed ? (
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          {row.unit} can't be converted to {row.purchase_unit_label} for this item. Add one in Admin › Settings › Unit Conversions.
                        </p>
                      ) : row.unit && row.shortfall !== row.quantity && (
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          {row.shortfall} {row.unit} → {row.quantity} {row.purchase_unit_label}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">Unit price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8"
                        value={row.unit_price}
                        onChange={(e) => patch(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Supplier</Label>
                      <SupplierChoiceSelect
                        options={row.options}
                        value={row.supplier_id}
                        onChange={(v) => pickSupplier(idx, v)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <Label className="text-xs">Notes for purchasing</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the purchasing team should know" />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-sm text-slate-600">
              Total <span className="font-semibold text-amber-700">{formatCurrency(total)}</span> · one order per supplier
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={submit} disabled={saving || !refs}>
                {saving ? "Submitting…" : "Submit for approval"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}