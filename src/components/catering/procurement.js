import { base44 } from "@/api/base44Client";
import { daysUntil } from "./cateringLogic";
import { readableOrderNumber } from "@/components/purchasing/orderNumber";
import { assertSuppliersCoverCategories } from "@/components/purchasing/supplierCategoryGuard";
import { convertQuantity, normalizeUnit, roundQty } from "@/lib/unitConversion";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Singleton settings record so lead times are configurable, never hardcoded. */
export async function getProcurementSettings() {
  const existing = await base44.entities.CateringProcurementSettings.filter({ setting_key: "default" });
  if (existing.length) return existing[0];
  return base44.entities.CateringProcurementSettings.create({
    setting_key: "default",
    planning_horizon_days: 14,
    urgent_threshold_days: 5,
    default_delivery_buffer_days: 2,
  });
}

export async function saveProcurementSettings(settings, data) {
  return base44.entities.CateringProcurementSettings.update(settings.id, data);
}

/** Shortfalls that still need covering, one line per inventory item. */
export function buildShortfallLines(reservations) {
  const map = new Map();
  reservations
    .filter((r) => r.status === "reserved" && (r.shortfall_quantity || 0) > 0)
    .filter((r) => !["po_pending", "po_approved", "po_delivered"].includes(r.procurement_status))
    .forEach((r) => {
      const prev = map.get(r.inventory_item_id);
      map.set(r.inventory_item_id, {
        inventory_item_id: r.inventory_item_id,
        inventory_item_name: r.inventory_item_name,
        unit: r.unit,
        demand: round2((prev?.demand || 0) + (r.quantity_reserved || 0)),
        quantity: round2((prev?.quantity || 0) + (r.shortfall_quantity || 0)),
        purposes: [...new Set([...(prev?.purposes || []), r.purpose])],
        reservation_ids: [...(prev?.reservation_ids || []), r.id],
      });
    });
  return [...map.values()];
}

/**
 * Supplier options for an item.
 * InventoryItem still carries a single preferred supplier, so alternatives are
 * derived from actual purchase history (who has really supplied this item, at
 * what price) combined with the ratings the Supplier entity already tracks.
 */
export function supplierOptionsForItem(itemId, { inventoryItems, suppliers, invoices }) {
  const item = inventoryItems.find((i) => i.id === itemId);
  const stats = new Map();

  invoices.forEach((inv) => {
    (inv.items || []).forEach((li) => {
      if (li.inventory_item_id !== itemId || !inv.supplier_id) return;
      const s = stats.get(inv.supplier_id) || { total: 0, count: 0, last_price: null, last_date: null };
      const invoiceTimestamp = inv.created_date || inv.invoice_date || "";
      s.total += Number(li.purchase_price) || 0;
      s.count += 1;
      if (!s.last_date || invoiceTimestamp > s.last_date) {
        s.last_date = invoiceTimestamp;
        s.last_price = Number(li.purchase_price) || 0;
      }
      stats.set(inv.supplier_id, s);
    });
  });

  const ids = new Set([...stats.keys()]);
  if (item?.supplier_id) ids.add(item.supplier_id);

  return [...ids]
    .map((id) => {
      const sup = suppliers.find((s) => s.id === id);
      if (!sup) return null;
      const st = stats.get(id);
      const inventoryEstimateIsNewer = id === item?.supplier_id
        && Number(item?.cost_per_unit) > 0
        && (!st?.last_date || String(item.updated_date || "") > st.last_date);
      const currentPrice = inventoryEstimateIsNewer
        ? Number(item.cost_per_unit)
        : st?.last_price ?? (id === item?.supplier_id ? item?.cost_per_unit || 0 : 0);
      return {
        supplier_id: id,
        name: sup.name,
        contact: sup.phone || sup.email || "",
        rating: sup.rating || 0,
        delivery_performance: sup.delivery_performance || 0,
        quality_rating: sup.quality_rating || 0,
        payment_terms: sup.payment_terms || "",
        is_active: sup.is_active !== false,
        last_price: currentPrice,
        avg_price: st && st.count ? round2(st.total / st.count) : id === item?.supplier_id ? item?.cost_per_unit || 0 : 0,
        purchases: st?.count || 0,
        is_preferred: id === item?.supplier_id,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.is_preferred ? 1 : 0) - (a.is_preferred ? 1 : 0) || (a.last_price || 0) - (b.last_price || 0));
}

/** Items an event may need ordered proactively — everything on the plan, not just shortfalls. */
export function buildHorizonLines(reservations) {
  const map = new Map();
  reservations
    .filter((r) => r.status === "reserved")
    .forEach((r) => {
      const prev = map.get(r.inventory_item_id);
      map.set(r.inventory_item_id, {
        inventory_item_id: r.inventory_item_id,
        inventory_item_name: r.inventory_item_name,
        unit: r.unit,
        quantity: round2((prev?.quantity || 0) + (r.quantity_reserved || 0)),
        purposes: [...new Set([...(prev?.purposes || []), r.purpose])],
        reservation_ids: [...(prev?.reservation_ids || []), r.id],
      });
    });
  return [...map.values()];
}

export function resolveUrgency(event, settings) {
  const days = daysUntil(event.event_date);
  return days <= (settings?.urgent_threshold_days ?? 5) ? "urgent" : "routine";
}

export function isWithinPlanningHorizon(event, settings) {
  return daysUntil(event.event_date) >= (settings?.planning_horizon_days ?? 14);
}

/**
 * Raise purchase orders for an event through the existing Purchases module.
 * Lines are grouped per chosen supplier, one PO per supplier, and every PO
 * enters the normal approval queue (pending_approval) — no catering bypass.
 */
export async function createCateringPurchaseOrders({ event, lines, trigger, branch, userEmail, settings, notes }) {
  const urgency = resolveUrgency(event, settings);
  const buffer = settings?.default_delivery_buffer_days ?? 2;
  const deliveryDate = new Date(event.event_date);
  deliveryDate.setDate(deliveryDate.getDate() - buffer);
  const expected = deliveryDate.toISOString().split("T")[0];

  const groups = new Map();
  lines
    .filter((l) => l.supplier_id && (Number(l.quantity) || 0) > 0)
    .forEach((l) => groups.set(l.supplier_id, [...(groups.get(l.supplier_id) || []), l]));

  // One rule for every order: each line's supplier must be tagged for the item's category.
  await assertSuppliersCoverCategories([...groups.values()].flat());

  const created = [];
  for (const [supplierId, group] of groups) {
    const items = group.map((l) => ({
      inventory_item_id: l.inventory_item_id,
      inventory_item_name: l.inventory_item_name,
      quantity_ordered: round2(l.quantity),
      purchase_unit: l.purchase_unit || "pcs",
      purchase_unit_label: l.purchase_unit_label || l.unit || "pcs",
      selling_unit: l.selling_unit || "pcs",
      selling_unit_label: l.selling_unit_label || l.unit || "pcs",
      unit: l.purchase_unit_label || l.unit || "pcs",
      unit_price: round2(l.unit_price),
      total_price: round2((Number(l.quantity) || 0) * (Number(l.unit_price) || 0)),
      approval_status: "pending",
      current_stock: l.current_stock ?? null,
      catering_shortfall_quantity: trigger === "shortfall" ? roundQty(l.shortfall ?? l.quantity, 4) : 0,
    }));

    const po = await base44.entities.PurchaseOrder.create({
      order_number: readableOrderNumber({
        prefix: "PO-CAT",
        neededBy: expected,
        eventName: event.event_name,
        supplierName: group[0].supplier_name,
        index: created.length + 1,
      }),
      items,
      supplier_id: supplierId,
      supplier: group[0].supplier_name,
      supplier_contact: group[0].supplier_contact || "",
      inventory_category_name: "Catering",
      order_date: new Date().toISOString().split("T")[0],
      expected_delivery_date: expected,
      needed_by_date: event.event_date,
      total_amount: items.reduce((s, i) => s + i.total_price, 0),
      status: "pending_approval",
      order_source: "catering",
      catering_event_id: event.id,
      catering_event_name: event.event_name,
      catering_event_date: event.event_date,
      catering_trigger: trigger,
      urgency,
      created_by_email: userEmail || "",
      branch_id: event.branch_id || branch?.id || "",
      branch_name: event.branch_id ? event.branch_name || "" : branch?.name || "",
      notes: [
        `${trigger === "shortfall" ? "Shortfall" : "Planning-horizon"} order for catering event "${event.event_name}" on ${event.event_date}.`,
        urgency === "urgent" ? "URGENT — event is imminent." : "",
        notes || "",
      ]
        .filter(Boolean)
        .join(" "),
    });

    // Link every covered reservation back to the PO
    const ids = [...new Set(group.flatMap((l) => l.reservation_ids || []))];
    await Promise.all(
      ids.map((id) =>
        base44.entities.CateringReservation.update(id, {
          purchase_order_id: po.id,
          purchase_order_number: po.order_number,
          procurement_status: "po_pending",
        })
      )
    );
    created.push(po);
  }

  await syncEventProcurement(event);
  return { created, urgency };
}

/**
 * Automatic path: as soon as a shortfall is detected for a confirmed event, raise
 * the covering purchase orders using each item's best-known supplier and last
 * known price. Staff can still edit the PO (or reject lines) during the normal
 * approval review, and can compare suppliers explicitly from the Planning tab.
 */
/**
 * A shortfall or plan line's quantity, kept in the reservation's unit (e.g. g),
 * as the quantity to buy in the item's purchase unit (e.g. kg). ok is false when
 * the two units can't be converted; the quantity is then left as it was.
 */
export function toPurchaseQuantity(line, item, unitRules = []) {
  const purchaseUnitLabel = item?.purchase_unit_label || item?.unit || line.unit || "pcs";
  const reqUnit = line.unit || item?.selling_unit_label || purchaseUnitLabel;
  if (!reqUnit || normalizeUnit(reqUnit) === normalizeUnit(purchaseUnitLabel)) {
    return { quantity: line.quantity, purchaseUnitLabel, ok: true };
  }
  const conv = convertQuantity(line.quantity, reqUnit, purchaseUnitLabel, {
    item,
    itemId: line.inventory_item_id,
    rules: unitRules,
    decimals: 4,
  });
  return conv.ok
    ? { quantity: roundQty(conv.quantity, 4), purchaseUnitLabel, ok: true }
    : { quantity: line.quantity, purchaseUnitLabel, ok: false };
}

export async function autoRaiseShortfallPOs({ event, reservations, branch, userEmail, settings }) {
  const lines = buildShortfallLines(reservations);
  if (lines.length === 0) return { created: [] };

  const [inventoryItems, suppliers, invoices, unitRules] = await Promise.all([
    base44.entities.InventoryItem.list("-created_date", 1000),
    base44.entities.Supplier.list("name"),
    base44.entities.PurchaseInvoice.list("-created_date", 200),
    base44.entities.UnitConversionRule.list("-created_date", 500).catch(() => []),
  ]);

  const priced = lines
    .map((l) => {
      const options = supplierOptionsForItem(l.inventory_item_id, { inventoryItems, suppliers, invoices });
      const pick = options.find((o) => o.is_active) || options[0];
      if (!pick) return null;
      const item = inventoryItems.find((i) => i.id === l.inventory_item_id);
      const { quantity: buyQty, purchaseUnitLabel } = toPurchaseQuantity(l, item, unitRules);
      return {
        ...l,
        shortfall: l.quantity,
        quantity: buyQty,
        supplier_id: pick.supplier_id,
        supplier_name: pick.name,
        supplier_contact: pick.contact,
        unit_price: pick.last_price || item?.cost_per_unit || 0,
        purchase_unit: item?.purchase_unit || "pcs",
        purchase_unit_label: purchaseUnitLabel,
        selling_unit: item?.selling_unit || "pcs",
        selling_unit_label: item?.selling_unit_label || l.unit || "pcs",
        current_stock: item?.quantity ?? null,
      };
    })
    .filter(Boolean);

  if (priced.length === 0) return { created: [], unsupplied: lines.length };

  const res = await createCateringPurchaseOrders({
    event,
    lines: priced,
    trigger: "shortfall",
    branch,
    userEmail,
    settings,
    notes: "Raised automatically on shortfall detection.",
  });
  return { ...res, unsupplied: lines.length - priced.length };
}

/**
 * Keep the event honest about procurement: re-read the live POs and push their
 * real state onto the reservations. A cancelled PO — or one whose items were
 * edited so the line no longer exists — drops the shortfall back to open.
 */
export async function syncEventProcurement(event) {
  const [reservations, eventOrders] = await Promise.all([
    base44.entities.CateringReservation.filter({ event_id: event.id, status: "reserved" }),
    base44.entities.PurchaseOrder.filter({ catering_event_id: event.id }),
  ]);

  // A queue-raised PO can be anchored to another event yet still cover this
  // event's reservations — fetch those referenced POs too so the sync sees them.
  const extraIds = [...new Set(
    reservations.map((r) => r.purchase_order_id).filter((id) => id && !eventOrders.some((o) => o.id === id))
  )];
  const extra = (await Promise.all(extraIds.map((id) => base44.entities.PurchaseOrder.get(id).catch(() => null)))).filter(Boolean);
  const orders = [...eventOrders, ...extra];

  // Delivered quantity still available per PO line, used to clear covered shortfalls.
  const deliveredLeft = new Map();
  orders.filter((o) => o.status === "delivered").forEach((o) =>
    (o.items || []).filter((i) => i.approval_status !== "rejected").forEach((i) =>
      deliveredLeft.set(`${o.id}:${i.inventory_item_id}`, Number(i.catering_shortfall_quantity) || Number(i.quantity_ordered) || 0)
    )
  );

  const updates = [];
  reservations.forEach((r) => {
    let next = "none";
    let poId = r.purchase_order_id || "";
    let poNumber = r.purchase_order_number || "";

    const po = orders.find((o) => o.id === r.purchase_order_id);
    const stillOnPo = po && (po.items || []).some(
      (i) => i.inventory_item_id === r.inventory_item_id && i.approval_status !== "rejected"
    );

    if (po && stillOnPo) {
      if (po.status === "cancelled") next = "po_cancelled";
      else if (po.status === "delivered") next = "po_delivered";
      else if (po.status === "pending" || po.status === "confirmed" || po.status === "shipped") next = "po_approved";
      else next = "po_pending";
    } else if (r.purchase_order_id) {
      // PO deleted, or the item was removed / rejected during review
      next = "po_cancelled";
      poId = "";
      poNumber = po ? r.purchase_order_number : "";
    }

    // Newly delivered: the received goods cover the shortfall (floor at 0).
    let shortfall = Number(r.shortfall_quantity) || 0;
    if (next === "po_delivered" && r.procurement_status !== "po_delivered" && shortfall > 0) {
      const key = `${po.id}:${r.inventory_item_id}`;
      const left = deliveredLeft.get(key) || 0;
      const covered = Math.min(left, shortfall);
      deliveredLeft.set(key, round2(left - covered));
      shortfall = round2(shortfall - covered);
    }

    if (next !== (r.procurement_status || "none") || poId !== (r.purchase_order_id || "") || shortfall !== (Number(r.shortfall_quantity) || 0)) {
      updates.push({ id: r.id, procurement_status: next, purchase_order_id: poId, purchase_order_number: poNumber, shortfall_quantity: shortfall });
    }
    r.procurement_status = next;
    r.shortfall_quantity = shortfall;
  });

  if (updates.length) await base44.entities.CateringReservation.bulkUpdate(updates);

  const shortfalls = reservations.filter((r) => (r.shortfall_quantity || 0) > 0);
  const openShortfalls = shortfalls.filter((r) => !["po_pending", "po_approved", "po_delivered"].includes(r.procurement_status));
  const activeOrders = orders.filter((o) => o.status !== "cancelled");
  const allDelivered = openShortfalls.length === 0 && activeOrders.length > 0
    && activeOrders.every((o) => o.status === "delivered")
    && shortfalls.every((r) => r.procurement_status === "po_delivered");

  await base44.entities.CateringEvent.update(event.id, {
    procurement_status: activeOrders.length === 0 ? "none" : allDelivered ? "covered" : activeOrders.some((o) => o.status === "delivered") ? "partially_delivered" : "po_raised",
    procurement_po_count: activeOrders.length,
    open_shortfall_count: openShortfalls.length,
    reservation_shortfall_count: shortfalls.length,
    reservation_status: openShortfalls.length > 0 ? "shortfall" : reservations.length ? "reserved" : "none",
  });

  return { reservations, orders, openShortfalls };
}

/** Re-sync every catering event a PO covers, then refresh the screens that show it. */
export async function syncCateringPurchaseOrder(order, queryClient) {
  if (order?.order_source !== "catering") return;
  const eventIds = order.catering_event_ids?.length ? order.catering_event_ids : [order.catering_event_id].filter(Boolean);
  const events = (await Promise.all(eventIds.map((id) => base44.entities.CateringEvent.get(id).catch(() => null)))).filter(Boolean);
  await Promise.all(events.map((e) => syncEventProcurement(e)));
  if (queryClient) {
    ["catering-pos-awaiting-approval", "catering-shortfall-queue", "purchaseOrders", "catering-events", "catering-reservations",
      "kitchen-release-slips", "release-slip-reservations", "approvals-ops"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
  }
}