import { base44 } from "@/api/base44Client";
import { round2 } from "./cateringLogic";
import { syncEventProcurement } from "./procurement";
import { findPlanningGaps, hasStockableRecipe } from "./planningGaps";
import { getStockFlow, syncDraftRequisition, cancelEventRequisition, RequisitionLockedError } from "./requisition/requisitionFlow";
import { toStockQuantity, convertQuantity, getItemStockUnit } from "@/lib/unitConversion";
import { toBranchStock } from "./branchStock";

/**
 * Explode a catering quote's line items into what the kitchen actually needs.
 *
 * Routing rule (uses the distinction that already exists in the system):
 *  - a required inventory item that is the OUTPUT of an active production Recipe
 *    must be MADE → a production batch, and the recipe's ingredients become
 *    production inputs.
 *  - anything else is pulled straight from stock.
 */
export async function buildEventRequirements(quote, guests) {
  const [menuItems, recipes] = await Promise.all([
    base44.entities.MenuItem.list("-created_date", 500),
    base44.entities.Recipe.list("-created_date", 500),
  ]);
  const activeRecipes = recipes.filter((r) => r.status !== "inactive");
  const normName = (s) => String(s || "").trim().toLowerCase();

  const needs = new Map(); // inventory_item_id -> { name, unit, qty }
  const unmapped = [];

  unmapped.push(...findPlanningGaps(quote, menuItems));

  (quote?.line_items || []).forEach((li) => {
    const qty = Number(li.quantity) || 0;
    if (qty <= 0 || li.manually_sourced) return;
    const mi = li.menu_item_id ? menuItems.find((m) => m.id === li.menu_item_id) : null;
    if (!hasStockableRecipe(mi)) return;
    // If this menu item has a linked manufacturing recipe (synced from the menu item),
    // demand the recipe's finished output item so buildEventRequirements routes it into a production batch.
    const linkedRecipe = activeRecipes.find(
      (r) =>
        (mi.manufacturing_recipe_id && r.id === mi.manufacturing_recipe_id) ||
        r.menu_item_id === mi.id ||
        (mi.output_inventory_item_id && r.output_item_id === mi.output_inventory_item_id) ||
        normName(r.name) === normName(mi.name)
    );
    if (linkedRecipe && linkedRecipe.output_item_id && (linkedRecipe.ingredients || []).length > 0) {
      const id = linkedRecipe.output_item_id;
      const prev = needs.get(id) || {
        inventory_item_id: id,
        name: linkedRecipe.output_item_name || mi.name || "",
        unit: linkedRecipe.output_unit || "portion",
        qty: 0,
      };
      needs.set(id, { ...prev, qty: prev.qty + qty });
      return;
    }
    mi.recipe.forEach((ing) => {
      const id = ing.inventory_item_id;
      if (!id) return;
      const add = (Number(ing.quantity_needed) || 0) * qty;
      const prev = needs.get(id) || { inventory_item_id: id, name: ing.inventory_item_name || "", unit: ing.unit || "", qty: 0 };
      needs.set(id, { ...prev, qty: prev.qty + add });
    });
  });

  const stockPulls = [];
  const productionBatches = [];

  needs.forEach((need) => {
    const recipe = activeRecipes.find((r) => r.output_item_id === need.inventory_item_id);
    if (!recipe) {
      stockPulls.push({ ...need, qty: round2(need.qty) });
      return;
    }
    const perBatch = Number(recipe.output_quantity) || 1;
    const batches = Math.ceil(round2(need.qty) / perBatch);
    productionBatches.push({
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      output_item_id: recipe.output_item_id,
      output_item_name: recipe.output_item_name || need.name,
      output_unit: recipe.output_unit || need.unit || "",
      required_quantity: round2(need.qty),
      per_batch: perBatch,
      batches,
      inputs: (recipe.ingredients || []).map((ing) => ({
        inventory_item_id: ing.inventory_item_id,
        name: ing.inventory_item_name || "",
        unit: ing.unit || "",
        qty: round2((Number(ing.quantity_needed) || 0) * batches),
      })),
    });
  });

  return { stockPulls, productionBatches, unmapped, guests: Number(guests) || 0 };
}

/**
 * Free stock per item = on hand − quantities actively reserved by OTHER events.
 *
 * `exclude` is the event (or events) whose own demand is being planned right now:
 * their reservations are the demand we are trying to satisfy, not competition for
 * stock, so they must not be subtracted. Accepts a single id or an array of ids —
 * the array form is what lets a multi-event purchase cart subtract on-hand ONCE
 * instead of once per event (which would double-count shared stock).
 */
export async function getFreeStockMap(exclude, rulesArg = null) {
  const [items, reservations, unitRules] = await Promise.all([
    base44.entities.InventoryItem.list("-created_date", 1000),
    base44.entities.CateringReservation.filter({ status: "reserved" }),
    rulesArg ? Promise.resolve(rulesArg) : base44.entities.UnitConversionRule.list("-created_date", 500).catch(() => []),
  ]);
  const itemById = new Map(items.map((it) => [it.id, it]));
  const excluded = new Set(Array.isArray(exclude) ? exclude : exclude ? [exclude] : []);
  const committed = new Map();
  reservations
    .filter((r) => !excluded.has(r.event_id))
    .forEach((r) => {
      const it = itemById.get(r.inventory_item_id);
      const rawQty = Number(r.quantity_reserved) || 0;
      const conv = it ? toStockQuantity(rawQty, r.unit || getItemStockUnit(it), it, unitRules) : { ok: true, quantity: rawQty };
      const qtyInStock = conv.ok ? conv.quantity : rawQty;
      committed.set(r.inventory_item_id, (committed.get(r.inventory_item_id) || 0) + qtyInStock);
    });

  const map = new Map();
  items.forEach((it) =>
    map.set(it.id, {
      item: it,
      name: it.name,
      unit: getItemStockUnit(it),
      on_hand: Number(it.quantity) || 0,
      free: Math.max(0, round2((Number(it.quantity) || 0) - (committed.get(it.id) || 0))),
    })
  );
  return map;
}

/**
 * Resolve the source package's material_requirements template (direct bulk
 * consumables not expressible as recipes) against the event's guest count.
 * Same approved formula as equipment: flat = fixed qty;
 * per_guest = ceil(guests / divisor) * qty.
 */
async function resolveMaterialTemplate(quote, guests) {
  const packageId = quote?.package_id;
  if (!packageId) return [];
  const pkg = await base44.entities.CateringPackage.get(packageId).catch(() => null);
  return (pkg?.material_requirements || [])
    .filter((r) => r.inventory_item_id)
    .map((r) => {
      const qty = Number(r.quantity) || 0;
      const divisor = Number(r.per_guest_divisor) || 1;
      const resolved = r.scaling_mode === "per_guest" ? Math.ceil((Number(guests) || 0) / divisor) * qty : qty;
      return { inventory_item_id: r.inventory_item_id, name: r.inventory_item_name || "", qty: round2(resolved) };
    })
    .filter((r) => r.qty > 0);
}

/** Create the catering production batches as ProductionOrder records tied to the event. */
export async function generateProductionPlan({ event, quote, requirements, branch, userEmail }) {
  const existing = await base44.entities.ProductionOrder.filter({ catering_event_id: event.id });
  const openIds = existing.filter((o) => o.status === "pending").map((o) => o.id);
  // Replanning replaces only batches that have not started yet
  await Promise.all(openIds.map((id) => base44.entities.ProductionOrder.delete(id)));

  const created = [];
  for (const b of requirements.productionBatches) {
    const order = await base44.entities.ProductionOrder.create({
      recipe_id: b.recipe_id,
      recipe_name: b.recipe_name,
      output_item_id: b.output_item_id,
      output_item_name: b.output_item_name,
      output_unit: b.output_unit,
      target_quantity: b.batches,
      required_output_quantity: b.required_quantity,
      status: "pending",
      branch_id: event.branch_id || branch?.id || "",
      branch_name: event.branch_id ? event.branch_name || "" : branch?.name || "",
      order_source: "catering",
      catering_event_id: event.id,
      catering_event_name: event.event_name,
      catering_guests: requirements.guests,
      needed_by_date: event.event_date,
      notes: `Catering batch for ${event.event_name} (${requirements.guests} guests)`,
    });
    created.push({ ...b, production_order_id: order.id });
  }

  await base44.entities.CateringEvent.update(event.id, {
    production_plan_status: created.length ? "planned" : "none",
    production_plan_date: new Date().toISOString(),
    production_planned_from_quote_id: quote?.id || "",
    production_batch_count: created.length,
  });

  return created;
}

/**
 * Reserve stock pulls and production inputs for the event, flagging any shortfall.
 * Reservations are a ledger — on-hand inventory is not mutated, so day-to-day
 * operations and every other module keep behaving exactly as before.
 */
export async function reserveForEvent({ event, quote, branch, userEmail }) {
  // The single server flow decision, made before anything is written. Every plannable event is on
  // Stock Release Slip Requisitions; a sent requisition or old-flow history (stock issued) is locked.
  const flow = await getStockFlow(event);
  if (flow.locked) throw new RequisitionLockedError(flow.message);

  const guests = Number(event.guarantee_locked ? event.guaranteed_guests : event.expected_guests) || 0;
  const planned = await buildEventRequirements(quote, guests);

  // Package material template — merged with recipe-derived needs. Merge rule:
  // the same item appearing in both sources SUMS (both are genuinely separate needs).
  const templateNeeds = await resolveMaterialTemplate(quote, guests);
  templateNeeds.forEach((t) => {
    const existing = planned.stockPulls.find((s) => s.inventory_item_id === t.inventory_item_id);
    if (existing) existing.qty = round2(existing.qty + t.qty);
    else planned.stockPulls.push({ inventory_item_id: t.inventory_item_id, name: t.name, unit: "", qty: t.qty });
  });

  // Each branch plans from its own stock: every need points at the event branch's own item.
  const { requirements, added } = await toBranchStock(planned, event.branch_id);

  // Replace this event's previous active reservations
  const previous = await base44.entities.CateringReservation.filter({ event_id: event.id, status: "reserved" });
  await Promise.all(
    previous.map((r) =>
      base44.entities.CateringReservation.update(r.id, {
        status: "released",
        released_by: userEmail || "",
        released_date: new Date().toISOString(),
        release_reason: "Superseded by a recalculated reservation",
      })
    )
  );

  const unitRules = await base44.entities.UnitConversionRule.list("-created_date", 500).catch(() => []);
  const batches = await generateProductionPlan({ event, quote, requirements, branch, userEmail });
  const freeStock = await getFreeStockMap(event.id, unitRules);

  const rows = [];
  const remainingFree = new Map([...freeStock].map(([id, stock]) => [id, Math.max(0, Number(stock.free) || 0)]));
  const allocateFreeStock = (itemId, quantity, reqUnit) => {
    const stock = freeStock.get(itemId);
    const it = stock?.item;
    const stockUnit = stock?.unit || "";
    const availableInStock = remainingFree.get(itemId) || 0;
    const reqQty = Number(quantity) || 0;
    const convToStock = it ? toStockQuantity(reqQty, reqUnit || stockUnit, it, unitRules) : { ok: true, quantity: reqQty, factor: 1 };
    const neededInStock = convToStock.ok ? convToStock.quantity : reqQty;
    const usedInStock = Math.min(availableInStock, neededInStock);
    remainingFree.set(itemId, Math.max(0, round2(availableInStock - usedInStock)));
    const shortfallInStock = Math.max(0, round2(neededInStock - usedInStock));
    // Convert available and shortfall back to the requested unit if a valid conversion was applied
    if (convToStock.ok && it && reqUnit && stockUnit) {
      const availInReq = convertQuantity(availableInStock, stockUnit, reqUnit, { item: it, itemId: it.id, rules: unitRules });
      const shortInReq = convertQuantity(shortfallInStock, stockUnit, reqUnit, { item: it, itemId: it.id, rules: unitRules });
      return {
        available: availInReq.ok ? round2(availInReq.quantity) : availableInStock,
        shortfall: shortInReq.ok ? Math.max(0, round2(shortInReq.quantity)) : shortfallInStock,
      };
    }
    return { available: availableInStock, shortfall: shortfallInStock };
  };
  const base = {
    branch_id: event.branch_id || branch?.id || "",
    branch_name: event.branch_id ? event.branch_name || "" : branch?.name || "",
    event_id: event.id,
    event_name: event.event_name,
    event_date: event.event_date,
    quote_id: quote?.id || "",
    needed_by_date: event.event_date,
    status: "reserved",
    reserved_by: userEmail || "",
  };

  requirements.stockPulls.forEach((s) => {
    const stock = freeStock.get(s.inventory_item_id);
    const unit = s.unit || stock?.unit || "";
    const allocation = allocateFreeStock(s.inventory_item_id, s.qty, unit);
    rows.push({
      ...base,
      inventory_item_id: s.inventory_item_id,
      inventory_item_name: s.name || stock?.name || "",
      unit,
      purpose: "stock_pull",
      quantity_reserved: s.qty,
      available_at_reservation: allocation.available,
      shortfall_quantity: allocation.shortfall,
    });
  });

  batches.forEach((b) => {
    b.inputs.forEach((inp) => {
      const stock = freeStock.get(inp.inventory_item_id);
      const unit = inp.unit || stock?.unit || "";
      const allocation = allocateFreeStock(inp.inventory_item_id, inp.qty, unit);
      rows.push({
        ...base,
        inventory_item_id: inp.inventory_item_id,
        inventory_item_name: inp.name || stock?.name || "",
        unit,
        purpose: "production_input",
        production_order_id: b.production_order_id,
        produced_item_name: b.output_item_name,
        quantity_reserved: inp.qty,
        available_at_reservation: allocation.available,
        shortfall_quantity: allocation.shortfall,
      });
    });
  });

  if (rows.length) await base44.entities.CateringReservation.bulkCreate(rows);

  const shortfalls = rows.filter((r) => r.shortfall_quantity > 0);
  await base44.entities.CateringEvent.update(event.id, {
    inventory_reserved: rows.length > 0,
    reservation_status: rows.length === 0 ? "none" : shortfalls.length ? "shortfall" : "reserved",
    reservation_shortfall_count: shortfalls.length,
    reservation_last_run: new Date().toISOString(),
  });
  await syncDraftRequisition(event);

  return { requirements, rows, shortfalls, batches, addedItems: added };
}

/**
 * Release everything committed to an event (cancellation or manual release).
 * Reservations are marked released and unstarted catering batches cancelled —
 * nothing is deleted, so a manager can review the release trail.
 */
export async function releaseForEvent({ event, userEmail, reason }) {
  const [reservations, orders] = await Promise.all([
    base44.entities.CateringReservation.filter({ event_id: event.id, status: "reserved" }),
    base44.entities.ProductionOrder.filter({ catering_event_id: event.id }),
  ]);

  await Promise.all([
    ...reservations.map((r) =>
      base44.entities.CateringReservation.update(r.id, {
        status: "released",
        released_by: userEmail || "",
        released_date: new Date().toISOString(),
        release_reason: reason || "Released for manager review",
        at_risk: false,
        // A covering PO that is not yet approved has no purpose once the event
        // lets go — drop it to cancelled. Approved/delivered POs keep their
        // state: those goods are (or will be) physically real.
        ...((r.shortfall_quantity || 0) > 0 && r.procurement_status === "po_pending"
          ? { procurement_status: "po_cancelled" }
          : {}),
      })
    ),
    ...orders
      .filter((o) => o.status === "pending" || o.status === "in_progress")
      .map((o) =>
        base44.entities.ProductionOrder.update(o.id, {
          status: "cancelled",
          notes: `${o.notes || ""} — released: ${reason || "event released"}`.trim(),
        })
      ),
  ]);

  // Refresh the procurement rollup from the live POs, then assert the released state
  // (sync alone would report "none" since no reserved rows remain).
  await syncEventProcurement(event);

  await base44.entities.CateringEvent.update(event.id, {
    inventory_reserved: false,
    reservation_status: "released",
    reservation_shortfall_count: 0,
    open_shortfall_count: 0,
    production_plan_status: "released",
  });
  await cancelEventRequisition(event, reason || "Released for manager review");

  return { releasedReservations: reservations.length, cancelledBatches: orders.length };
}