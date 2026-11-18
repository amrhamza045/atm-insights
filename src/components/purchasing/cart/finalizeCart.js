import { base44 } from "@/api/base44Client";
import { round2 } from "@/components/catering/cateringLogic";
import { getProcurementSettings, resolveUrgency } from "@/components/catering/procurement";
import { cartLineTotal, cartSupplierGroups, loadCartReferenceData } from "./recommendedCart";
import { purchaseUnitOptions } from '@/components/purchasing/purchaseUnits';
import { assertSuppliersCoverCategories } from "@/components/purchasing/supplierCategoryGuard";
import { readableOrderNumber } from "@/components/purchasing/orderNumber";
import { roundQty, getMergedUnitCatalog, normalizeUnit } from "@/lib/unitConversion";

const recommendedOrderNumber = (args) => readableOrderNumber({ prefix: "PO-REC", ...args });

/** One recommended order per supplier, with separate approval and receipt. */
export async function finalizeRecommendedCart({ lines, events, branch, userEmail, notes }) {
  const usable = (lines || []).filter((l) => l.supplier_id && (Number(l.quantity) || 0) > 0);
  if (!usable.length) throw new Error("Add at least one line with a supplier and a quantity above zero");

  const reference = await loadCartReferenceData();
  const catalog = getMergedUnitCatalog(reference.unitDefinitions).filter(u => u.is_active !== false);
  for (const line of usable) {
    const item = reference.inventoryItems.find(i => i.id === line.inventory_item_id);
    if (line.conversion_warning || !item || !purchaseUnitOptions(item, catalog, reference.unitRules)
      .some(u => u.code === normalizeUnit(line.purchase_unit_label || line.unit))) {
      throw new Error(`Define a valid purchase-to-stock conversion for ${line.inventory_item_name} before creating the PO`);
    }
  }
  // One rule for every order: each line's supplier must be tagged for the item's category.
  await assertSuppliersCoverCategories(usable);

  const settings = await getProcurementSettings();
  const dates = (events || []).map((e) => e.event_date).filter(Boolean).sort();
  const earliest = dates[0] || "";
  const anchor = (events || []).find((e) => e.event_date === earliest) || (events || [])[0] || {};

  const urgency = anchor.event_date ? resolveUrgency(anchor, settings) : "routine";
  const buffer = settings?.default_delivery_buffer_days ?? 2;
  let expected = "";
  if (earliest) {
    const d = new Date(earliest);
    d.setDate(d.getDate() - buffer);
    expected = d.toISOString().split("T")[0];
  }

  const supplierGroups = cartSupplierGroups(usable);

  const groups = supplierGroups;

  const created = [];

  for (const group of groups) {
    const items = group.lines.map((l) => ({
      inventory_item_id: l.inventory_item_id,
      inventory_item_name: l.inventory_item_name,
      quantity_ordered: roundQty(l.quantity, 4),
      purchase_unit: l.purchase_unit || "pcs",
      purchase_unit_label: l.purchase_unit_label || l.unit || "pcs",
      selling_unit: l.selling_unit || "pcs",
      selling_unit_label: l.selling_unit_label || l.unit || "pcs",
      unit: l.purchase_unit_label || l.unit || "pcs",
      unit_price: roundQty(l.unit_price),
      total_price: cartLineTotal(l),
      approval_status: "pending",
      current_stock: l.free_stock ?? null,
      catering_shortfall_quantity: roundQty(l.shortfall || 0, 4),
    }));

    // Events this particular supplier's lines actually serve
    const groupEvents = [];
    group.lines.forEach((l) =>
      (l.events || []).forEach((e) => {
        if (e.id && !groupEvents.some((g) => g.id === e.id)) groupEvents.push(e);
      })
    );
    const ordered = groupEvents.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const primary = ordered[0] || {};

    // Shortfall-driven only if every line was raised against a real shortfall;
    // any manually added or over-ordered line makes this a plan-ahead order.
    const allShortfall = group.lines.every((l) => (l.shortfall || 0) > 0);

    const po = await base44.entities.PurchaseOrder.create({
      order_number: recommendedOrderNumber({
        neededBy: primary.date || earliest,
        eventName: primary.name,
        supplierName: group.supplier_name,
        index: created.length + 1,
      }),
      items,
      supplier_id: group.supplier_id,
      supplier: group.supplier_name,
      supplier_contact: group.lines[0]?.supplier_contact || "",
      inventory_category_name: "Catering",
      order_date: new Date().toISOString().split("T")[0],
      expected_delivery_date: expected,
      needed_by_date: primary.date || earliest || "",
      total_amount: items.reduce((s, i) => s + i.total_price, 0),
      status: "recommended",
      order_source: "catering",
      catering_event_ids: ordered.map((e) => e.id),
      catering_event_names: ordered.map((e) => e.name || ""),
      catering_event_id: primary.id || "",
      catering_event_name: primary.name || "",
      catering_event_date: primary.date || "",
      catering_trigger: allShortfall ? "shortfall" : "planning_horizon",
      urgency,
      created_by_email: userEmail || "",
      branch_id: branch?.id || anchor.branch_id || "",
      branch_name: branch?.name || anchor.branch_name || "",
      notes: [
        `Recommended purchase cart for ${ordered.length} catering event(s): ${ordered
          .map((e) => e.name)
          .filter(Boolean)
          .join(", ")}.`,
        urgency === "urgent" ? "URGENT — the earliest event is imminent." : "",
        notes || "",
      ]
        .filter(Boolean)
        .join(" "),
    });

    // Link the open shortfalls this order covers, so the Shortfall Queue and the
    // next cart never order them again.
    const itemIds = new Set(group.lines.filter((l) => (Number(l.quantity) || 0) > 0).map((l) => l.inventory_item_id));
    const eventIds = ordered.map((e) => e.id);
    const open = (await base44.entities.CateringReservation.filter({ event_id: { $in: eventIds }, status: "reserved" }))
      .filter((r) => (Number(r.shortfall_quantity) || 0) > 0 && itemIds.has(r.inventory_item_id)
        && ["none", "po_cancelled"].includes(r.procurement_status || "none"));
    if (open.length) {
      await base44.entities.CateringReservation.bulkUpdate(open.map((r) => ({
        id: r.id, purchase_order_id: po.id, purchase_order_number: po.order_number, procurement_status: "po_pending",
      })));
    }

    created.push(po);
  }

  return { created, urgency, supplierCount: supplierGroups.length, merged: false };
}