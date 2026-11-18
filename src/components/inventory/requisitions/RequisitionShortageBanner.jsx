import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { pickSupplierForItem } from "@/components/purchasing/supplierCategories";
import { assertSuppliersCoverCategories } from "@/components/purchasing/supplierCategoryGuard";
import { readableOrderNumber } from "@/components/purchasing/orderNumber";
import { getProcurementSettings, resolveUrgency, syncEventProcurement } from "@/components/catering/procurement";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Shortage warning & one-click Draft PO creator for Inventory's requisition reply.
 * Prevents duplicate draft POs for the same event + item shortages on retry.
 */
export default function RequisitionShortageBanner({ requisition, shortages, serverShortageAttempted }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: existingOrders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["requisition-event-pos", requisition.event_id],
    queryFn: () => base44.entities.PurchaseOrder.filter({ catering_event_id: requisition.event_id }, "-created_date", 100),
    enabled: !!requisition?.event_id && shortages.length > 0,
  });

  if (!shortages.length) return null;

  // Active (non-cancelled, non-delivered) POs already raised for this event
  const activeOrders = existingOrders.filter(
    (o) => !["cancelled", "delivered", "rejected"].includes(o.status) && !o.purchase_recorded_invoice_id
  );
  const onOrderByItem = new Map();
  activeOrders.forEach((o) =>
    (o.items || []).forEach((i) => {
      if (!i.inventory_item_id || i.approval_status === "rejected") return;
      onOrderByItem.set(
        i.inventory_item_id,
        round2((onOrderByItem.get(i.inventory_item_id) || 0) + (Number(i.quantity_ordered) || 0))
      );
    })
  );

  const uncovered = shortages
    .map((s) => {
      const covered = onOrderByItem.get(s.inventory_item_id) || 0;
      const remaining = Math.max(0, round2(s.shortfall - covered));
      return { ...s, covered, remaining };
    })
    .filter((s) => s.remaining > 0);

  const raiseDraftPO = async () => {
    if (!uncovered.length) {
      toast.info("Draft purchase order(s) already cover these shortage items.");
      return;
    }
    setCreating(true);
    try {
      const [user, event, settings, suppliers, items] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.CateringEvent.get(requisition.event_id).catch(() => null),
        getProcurementSettings().catch(() => null),
        base44.entities.Supplier.list("name"),
        base44.entities.InventoryItem.filter({ id: { $in: uncovered.map((u) => u.inventory_item_id) } }, "name", 500),
      ]);
      const itemById = new Map(items.map((i) => [i.id, i]));
      const ev = event || {
        id: requisition.event_id,
        event_name: requisition.event_name || "Catering Event",
        event_date: requisition.event_date || new Date().toISOString().split("T")[0],
        branch_id: requisition.branch_id || "",
        branch_name: requisition.branch_name || "",
      };
      const urgency = ev.event_date ? resolveUrgency(ev, settings) : "routine";
      const buffer = settings?.default_delivery_buffer_days ?? 2;
      const deliveryDate = new Date(ev.event_date || Date.now());
      deliveryDate.setDate(deliveryDate.getDate() - buffer);
      const expected = deliveryDate.toISOString().split("T")[0];

      // Group uncovered shortage items by preferred/category supplier (fallback to General Supplier so no item is dropped)
      const groups = new Map();
      for (const u of uncovered) {
        const inv = itemById.get(u.inventory_item_id);
        const pick = inv ? pickSupplierForItem(inv, suppliers) : { supplierId: "" };
        const supObj = suppliers.find((s) => s.id === pick.supplierId);
        const key = supObj ? supObj.id : "general";
        const group = groups.get(key) || {
          supplier_id: supObj?.id || "",
          supplier_name: supObj?.name || inv?.supplier || "General Supplier",
          supplier_contact: supObj?.phone || supObj?.email || "",
          lines: [],
        };
        const unitPrice = round2(Number(inv?.cost_per_unit) || 0);
        group.lines.push({
          ...u,
          inv,
          unit_price: unitPrice,
          quantity_ordered: u.remaining,
          total_price: round2(u.remaining * unitPrice),
        });
        groups.set(key, group);
      }

      // Every line's supplier must be tagged for the item's category — checked before anything is created.
      await assertSuppliersCoverCategories([...groups.values()].flatMap((g) => g.lines.map((l) => ({
        supplier_id: g.supplier_id, supplier_name: g.supplier_name,
        inventory_item_id: l.inventory_item_id, inventory_item_name: l.inventory_item_name || l.inv?.name,
      }))));

      const created = [];
      let idx = 0;
      for (const group of groups.values()) {
        idx += 1;
        const poItems = group.lines.map((l) => ({
          inventory_item_id: l.inventory_item_id,
          inventory_item_name: l.inventory_item_name || l.inv?.name || "",
          quantity_ordered: l.quantity_ordered,
          purchase_unit: l.inv?.purchase_unit || "pcs",
          purchase_unit_label: l.inv?.purchase_unit_label || l.unit || "pcs",
          selling_unit: l.inv?.selling_unit || "pcs",
          selling_unit_label: l.inv?.selling_unit_label || l.unit || "pcs",
          unit: l.inv?.purchase_unit_label || l.unit || "pcs",
          unit_price: l.unit_price,
          total_price: l.total_price,
          approval_status: "pending",
          current_stock: l.inv?.quantity ?? null,
          catering_shortfall_quantity: l.quantity_ordered,
        }));

        const po = await base44.entities.PurchaseOrder.create({
          order_number: readableOrderNumber({
            prefix: "PO-REQ",
            neededBy: expected,
            eventName: ev.event_name,
            supplierName: group.supplier_name,
            index: idx,
          }),
          items: poItems,
          supplier_id: group.supplier_id,
          supplier: group.supplier_name,
          supplier_contact: group.supplier_contact,
          inventory_category_name: "Catering",
          order_date: new Date().toISOString().split("T")[0],
          expected_delivery_date: expected,
          needed_by_date: ev.event_date,
          total_amount: round2(poItems.reduce((s, i) => s + i.total_price, 0)),
          status: "pending_approval",
          order_source: "catering",
          catering_event_id: ev.id,
          catering_event_name: ev.event_name,
          catering_event_date: ev.event_date,
          catering_event_ids: [ev.id],
          catering_event_names: [ev.event_name],
          catering_trigger: "shortfall",
          urgency,
          created_by_email: user?.email || "",
          branch_id: requisition.branch_id || ev.branch_id || "",
          branch_name: requisition.branch_name || ev.branch_name || "",
          notes: `Draft PO raised from requisition ${requisition.requisition_number} (${ev.event_name}) for shortage items.`,
        });

        const resIds = [...new Set(group.lines.flatMap((l) => l.reservation_ids || []).filter(Boolean))];
        if (resIds.length) {
          await Promise.all(
            resIds.map((id) =>
              base44.entities.CateringReservation.update(id, {
                purchase_order_id: po.id,
                purchase_order_number: po.order_number,
                procurement_status: "po_pending",
              }).catch(() => null)
            )
          );
        }
        created.push(po);
      }

      if (event) await syncEventProcurement(event).catch(() => null);
      await refetchOrders();
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      toast.success(
        `Created ${created.length} draft PO(s) (${created.map((p) => p.order_number).join(", ")}). Complete PO approval & receiving, then return to send this reply.`
      );
    } catch (e) {
      toast.error(e?.message || "Could not create draft purchase order");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-lg border border-warning-300 bg-warning-50 p-3.5 space-y-2.5 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-warning-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-warning-900">
              {serverShortageAttempted
                ? "Your edits were saved, but the requisition cannot be confirmed until shortage items are available"
                : `${shortages.length} item(s) exceed available free stock`}
            </p>
            <p className="text-xs text-warning-800">
              Raise a draft PO for these items first, complete the normal PO approval and receiving flow, then return here to send your saved reply once stock is available.
            </p>
          </div>
        </div>
        {uncovered.length > 0 ? (
          <Button
            type="button"
            size="sm"
            onClick={raiseDraftPO}
            disabled={creating}
            className="shrink-0 gap-1.5 bg-warning-700 hover:bg-warning-800 text-white"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            Raise Draft PO ({uncovered.length})
          </Button>
        ) : (
          <Badge variant="outline" className="shrink-0 gap-1 border-success-300 bg-success-50 text-success-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Draft PO raised
          </Badge>
        )}
      </div>
      <div className="space-y-1 pt-1 border-t border-warning-200/70">
        {shortages.map((s) => {
          const covered = onOrderByItem.get(s.inventory_item_id) || 0;
          return (
            <div key={s.inventory_item_id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-warning-900">
              <span className="font-medium">{s.inventory_item_name}</span>
              <span>
                Confirmed: <strong>{s.needed} {s.unit}</strong> · Free: <strong>{s.raw_free} {s.unit}</strong> · Missing:{" "}
                <strong className="text-danger-700">{s.shortfall} {s.unit}</strong>
                {covered > 0 && <span className="ml-1.5 text-success-800">(On draft/open PO: {covered} {s.unit})</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}