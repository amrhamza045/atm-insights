import { base44 } from "@/api/base44Client";
import { round2 } from "@/components/catering/cateringLogic";
import { buildEventRequirements, getFreeStockMap } from "@/components/catering/productionPlanning";
import { supplierOptionsForItem } from "@/components/catering/procurement";
import { toBranchStock } from "@/components/catering/branchStock";
import { purchaseUnitPrice, purchaseUnitType } from '@/components/purchasing/purchaseUnits';
import {
  convertCartShortfallToBuyQuantity,
  convertQuantity,
  getItemCostUnit,
  getItemStockUnit,
  normalizeUnit,
  registerUnitCatalog,
  roundQty,
} from "@/lib/unitConversion";

export { convertCartShortfallToBuyQuantity };

/**
 * Only events that are actually committed may drive real spend. Enquiry and
 * quoted events are deliberately excluded — they may never happen. Cancelled and
 * completed events are excluded for the obvious reasons.
 */
export const CART_EVENT_STATUSES = [
  "deposit_pending",
  "deposit_pending_verification",
  "confirmed",
  "in_progress",
];

export function isCartEligible(event) {
  return !!event && CART_EVENT_STATUSES.includes(event.status);
}

export function todayIso() {
  return new Date().toISOString().split("T")[0];
}

/** Upcoming, confirmed-or-better events a cart can be built from. */
export async function loadCartEligibleEvents(branchId) {
  const all = await base44.entities.CateringEvent.list("event_date", 500);
  return all
    .filter((e) => isCartEligible(e))
    .filter((e) => !branchId || e.branch_id === branchId);
}

/** Reference data every line needs to resolve its supplier, units, conversion rules and price. */
export async function loadCartReferenceData(branchId = null) {
  const [rawInventoryItems, suppliers, rawInvoices, unitRules, unitDefinitions] = await Promise.all([
    base44.entities.InventoryItem.filter(branchId ? { branch_id: branchId } : {}, "-created_date", 1000),
    base44.entities.Supplier.list("name"),
    base44.entities.PurchaseInvoice.filter(branchId ? { branch_id: branchId } : {}, "-created_date", 200),
    base44.entities.UnitConversionRule.list("-created_date", 500).catch(() => []),
    base44.entities.UnitDefinition.list("-created_date", 500).catch(() => []),
  ]);
  const inventoryItems = rawInventoryItems.filter((i) => !branchId || i.branch_id === branchId);
  const invoices = rawInvoices.filter((inv) => inv.branch_id && (!branchId || inv.branch_id === branchId));
  if (Array.isArray(unitDefinitions) && unitDefinitions.length > 0) {
    registerUnitCatalog(unitDefinitions);
  }
  return { inventoryItems, suppliers, invoices, unitRules: unitRules || [], unitDefinitions: unitDefinitions || [] };
}

function resolveSupplierAndUnits(itemId, ref) {
  const item = ref.inventoryItems.find((i) => i.id === itemId);
  const options = supplierOptionsForItem(itemId, ref);
  const pick = options.find((o) => o.is_active) || options[0] || null;
  return {
    supplier_id: pick?.supplier_id || "",
    supplier_name: pick?.name || "",
    supplier_contact: pick?.contact || "",
    supplier_options: options,
    unit_price: purchaseUnitPrice(item || { id: itemId }, getItemCostUnit(item), ref.invoices, ref.unitRules),
    purchase_unit: purchaseUnitType(getItemCostUnit(item)),
    purchase_unit_label: normalizeUnit(getItemCostUnit(item)),
    selling_unit: item?.selling_unit || "pcs",
    selling_unit_label: item?.selling_unit_label || item?.unit || "pcs",
    category_id: item?.category_id || "",
    category_name: item?.category_name || "",
    on_hand: Number(item?.quantity) || 0,
  };
}

/**
 * Aggregate what every selected event needs, net it against free stock ONCE,
 * and return the shortfall-only buy list grouped-ready by supplier with
 * Buy quantity converted into the supplier's purchase unit.
 */
export async function buildRecommendedCart({ events, branchId = null }) {
  const eligible = (events || []).filter(isCartEligible);
  if (!eligible.length) return { lines: [], unmapped: [], missingQuote: [], events: [] };

  const effectiveBranchId = branchId || eligible[0]?.branch_id || null;
  const ref = await loadCartReferenceData(effectiveBranchId);
  const itemById = new Map(ref.inventoryItems.map((i) => [i.id, i]));
  const unitRules = ref.unitRules || [];

  const demand = new Map();
  const unmapped = [];
  const missingQuote = [];

  const accumulateDemand = (ev, itemId, name, unit, rawQty, purpose, producedFor) => {
    const qty = Number(rawQty) || 0;
    if (!itemId || !(qty > 0)) return;
    const item = itemById.get(itemId);
    const prev = demand.get(itemId) || {
      inventory_item_id: itemId,
      inventory_item_name: name || item?.name || "",
      unit: unit || getItemStockUnit(item) || "",
      demand: 0,
      purposes: [],
      produced_for: [],
      events: [],
    };
    const targetUnit = prev.unit || unit || getItemStockUnit(item) || "";
    let alignedQty = qty;
    if (unit && targetUnit && normalizeUnit(unit) !== normalizeUnit(targetUnit)) {
      const conv = convertQuantity(qty, unit, targetUnit, { item, itemId, rules: unitRules, decimals: 4 });
      if (conv.ok) alignedQty = conv.quantity;
    }
    prev.unit = targetUnit;
    prev.demand = roundQty(prev.demand + alignedQty, 4);
    if (!prev.inventory_item_name && name) prev.inventory_item_name = name;
    if (purpose && !prev.purposes.includes(purpose)) prev.purposes.push(purpose);
    if (producedFor && !prev.produced_for.includes(producedFor)) prev.produced_for.push(producedFor);
    const hit = prev.events.find((e) => e.id === ev.id);
    if (hit) hit.qty = roundQty(hit.qty + alignedQty, 4);
    else prev.events.push({ id: ev.id, name: ev.event_name, date: ev.event_date, qty: roundQty(alignedQty, 4) });
    demand.set(itemId, prev);
  };

  // Events that already have reservations are driven by their live shortfall
  // rows (these include package materials). Only items currently short are
  // considered; the item's full reserved need is then netted against stock below.
  const reservations = await base44.entities.CateringReservation.filter(
    { event_id: { $in: eligible.map((e) => e.id) }, status: "reserved" }, "-created_date", 2000
  );
  const reservedEvents = new Set(reservations.map((r) => r.event_id));
  const shortKeys = new Set(
    reservations.filter((r) => (Number(r.shortfall_quantity) || 0) > 0).map((r) => `${r.event_id}|${r.inventory_item_id}`)
  );

  for (const ev of eligible) {
    if (reservedEvents.has(ev.id)) {
      reservations
        .filter((r) => r.event_id === ev.id && shortKeys.has(`${ev.id}|${r.inventory_item_id}`))
        .forEach((r) => {
          accumulateDemand(
            ev,
            r.inventory_item_id,
            r.inventory_item_name,
            r.unit,
            r.quantity_reserved,
            r.purpose || "stock_pull",
            r.produced_item_name
          );
        });
      continue;
    }

    const quote = ev.active_quote_id
      ? await base44.entities.CateringQuote.get(ev.active_quote_id).catch(() => null)
      : null;
    if (!quote) {
      missingQuote.push({ id: ev.id, name: ev.event_name, date: ev.event_date });
      continue;
    }

    const guests = Number(ev.guarantee_locked ? ev.guaranteed_guests : ev.expected_guests) || 0;
    // Each branch buys for its own stock: needs point at the event branch's own items.
    const { requirements: req } = await toBranchStock(await buildEventRequirements(quote, guests), ev.branch_id);

    req.stockPulls.forEach((s) => accumulateDemand(ev, s.inventory_item_id, s.name, s.unit, s.qty, "stock_pull"));
    req.productionBatches.forEach((b) =>
      b.inputs.forEach((inp) =>
        accumulateDemand(ev, inp.inventory_item_id, inp.name, inp.unit, inp.qty, "production_input", b.output_item_name)
      )
    );
    req.unmapped.forEach((u) =>
      unmapped.push({ ...u, event_id: ev.id, event_name: ev.event_name, event_date: ev.event_date })
    );
  }

  // On-hand is netted once, across the whole selection: the selected events' own
  // reservations are the demand being satisfied, so they are excluded from the
  // "committed by others" pool rather than counted against us.
  const ids = eligible.map((e) => e.id);
  const [freeStock, orders] = await Promise.all([
    getFreeStockMap(ids, unitRules),
    base44.entities.PurchaseOrder.list("-created_date", 500),
  ]);

  // Recalculated live every time: received stock is already in free stock, so
  // only orders still open (not received, not cancelled) for these events are
  // netted as "on order". Convert each PO line from its ordered purchase unit
  // into the demand's unit so units are never mixed when subtracting.
  const openEventOrders = orders
    .filter((o) => !["cancelled", "delivered", "rejected"].includes(o.status) && !o.purchase_recorded_invoice_id)
    .filter((o) => ids.includes(o.catering_event_id) || (o.catering_event_ids || []).some((id) => ids.includes(id)));

  const lines = [...demand.values()]
    .map((d) => {
      const item = itemById.get(d.inventory_item_id);
      const stock = freeStock.get(d.inventory_item_id);
      const reqUnit = d.unit || stock?.unit || getItemStockUnit(item) || "";
      const stockUnit = stock?.unit || getItemStockUnit(item) || reqUnit;

      // Convert free stock from stockUnit (e.g. kg/L) into reqUnit (e.g. g/ml)
      const rawFree = Number(stock?.free) || 0;
      let freeInReqUnit = rawFree;
      if (rawFree > 0 && stockUnit && reqUnit && normalizeUnit(stockUnit) !== normalizeUnit(reqUnit)) {
        const convFree = convertQuantity(rawFree, stockUnit, reqUnit, {
          item,
          itemId: d.inventory_item_id,
          rules: unitRules,
          decimals: 4,
        });
        if (convFree.ok) freeInReqUnit = convFree.quantity;
      }
      freeInReqUnit = roundQty(freeInReqUnit, 4);

      // Sum open PO quantities for this item, converted from PO unit into reqUnit
      let onOrderInReqUnit = 0;
      openEventOrders.forEach((o) => {
        (o.items || []).forEach((poLine) => {
          if (poLine.inventory_item_id !== d.inventory_item_id || poLine.approval_status === "rejected") return;
          const orderedQty = Number(poLine.quantity_ordered) || 0;
          if (!(orderedQty > 0)) return;
          const poUnit = poLine.unit || poLine.purchase_unit_label || getItemCostUnit(item) || reqUnit;
          if (poUnit && reqUnit && normalizeUnit(poUnit) !== normalizeUnit(reqUnit)) {
            const convOrd = convertQuantity(orderedQty, poUnit, reqUnit, {
              item,
              itemId: d.inventory_item_id,
              rules: unitRules,
              decimals: 4,
            });
            if (convOrd.ok) {
              onOrderInReqUnit += convOrd.quantity;
              return;
            }
          }
          onOrderInReqUnit += orderedQty;
        });
      });

      const shortfall = Math.max(0, roundQty(d.demand - freeInReqUnit - onOrderInReqUnit, 4));
      const supplierAndUnits = resolveSupplierAndUnits(d.inventory_item_id, ref);
      const convBuy = convertCartShortfallToBuyQuantity(shortfall, reqUnit, item || supplierAndUnits, unitRules);

      return {
        ...d,
        unit: reqUnit,
        free_stock: freeInReqUnit,
        shortfall,
        quantity: convBuy.quantity,
        conversion_applied: convBuy.converted,
        conversion_factor: convBuy.factor,
        conversion_warning: convBuy.ok ? "" : convBuy.message || "",
        manual: false,
        ...supplierAndUnits,
      };
    })
    .filter((l) => l.shortfall > 0)
    .sort((a, b) => (a.inventory_item_name || "").localeCompare(b.inventory_item_name || ""));

  return { lines, unmapped, missingQuote, events: eligible, reference: ref };
}

/**
 * A hand-added line — used to cover bespoke quote lines that have no recipe, or
 * anything else the buyer knows is needed. It carries no computed demand, so its
 * shortfall is whatever quantity the buyer types in.
 */
export function makeManualLine(item, ref, events = []) {
  return {
    inventory_item_id: item.id,
    inventory_item_name: item.name,
    unit: item.selling_unit_label || item.unit || "",
    demand: 0,
    free_stock: Number(item.quantity) || 0,
    shortfall: 0,
    quantity: 0,
    purposes: ["manual"],
    produced_for: [],
    events: events.map((e) => ({ id: e.id, name: e.event_name, date: e.event_date, qty: 0 })),
    manual: true,
    ...resolveSupplierAndUnits(item.id, ref),
  };
}

export function cartSupplierGroups(lines) {
  const map = new Map();
  lines.forEach((l) => {
    const key = l.supplier_id || "__unassigned__";
    const group = map.get(key) || {
      supplier_id: l.supplier_id || "",
      supplier_name: l.supplier_name || "No supplier assigned",
      lines: [],
    };
    group.lines.push(l);
    map.set(key, group);
  });
  return [...map.values()];
}

export function cartLineTotal(line) {
  return round2((Number(line.quantity) || 0) * (Number(line.unit_price) || 0));
}

export function cartTotal(lines) {
  return round2(lines.reduce((s, l) => s + cartLineTotal(l), 0));
}