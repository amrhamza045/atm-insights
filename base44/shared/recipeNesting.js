// Multi-level recipe support: an ingredient whose inventory item is the output
// of another active recipe is a "sub-recipe" ingredient. Parent production only
// consumes FREE (non-reserved) stock of it; any shortfall is reported together
// with the raw-material shortfalls needed to produce the missing sub-recipe batches.
// All quantities are converted into canonical stock units via unitConversion.js.

import {
  loadConversionRules,
  getItemStockUnit,
  convertQuantity,
  toStockQuantity,
  normalizeUnit,
} from './unitConversion.js';

const MAX_DEPTH = 8;
const round = (n) => Math.round(n * 10000) / 10000;

// Stock minus active catering reservations (converted to the item's stock unit).
// Reservations held by `ownOrderId` (the batch being produced) are not counted against it.
export async function freeStock(db, itemId, ownOrderId, rulesArg = null) {
  const inv = await db.InventoryItem.get(itemId).catch(() => null);
  if (!inv) return { inv: null, free: 0, stockUnit: '' };
  const rules = rulesArg || (await loadConversionRules(db));
  const stockUnit = getItemStockUnit(inv);
  const res = await db.CateringReservation.filter({ inventory_item_id: itemId, status: 'reserved' });
  const reserved = res
    .filter((r) => !ownOrderId || r.production_order_id !== ownOrderId)
    .reduce((s, r) => {
      const rawQty = Number(r.quantity_reserved) || 0;
      const conv = toStockQuantity(rawQty, r.unit || stockUnit, inv, rules);
      return s + (conv.ok ? conv.quantity : rawQty);
    }, 0);
  return { inv, free: Math.max(0, round((Number(inv.quantity) || 0) - reserved)), stockUnit };
}

/**
 * Available stock for an event-linked catering production batch, normalized to the item's stock unit:
 * - Only stock released into this event's kitchen custody (status === 'consumed'
 *   with remaining custody_quantity > 0, or actual_quantity - custody_consumed_quantity
 *   for legacy released rows) OR sub-recipe output produced in custody for this event.
 * - Never falls back to general shelf stock or still-unreleased reservations, so
 *   catering production only consumes event-released custody stock.
 */
export async function eventCustodyStock(db, itemId, eventId, ownOrderId, rulesArg = null) {
  const inv = await db.InventoryItem.get(itemId).catch(() => null);
  const stockUnit = getItemStockUnit(inv);
  if (!eventId) return { inv, custody: 0, unreleasedReserved: 0, matchingReservations: [], stockUnit };
  const rules = rulesArg || (await loadConversionRules(db));
  const allRes = await db.CateringReservation.filter({ event_id: eventId, inventory_item_id: itemId });
  const matching = allRes.filter((r) =>
    !r.production_order_id || !ownOrderId || r.production_order_id === ownOrderId
  );
  const pool = matching.length > 0 ? matching : allRes;
  let custody = 0;
  let unreleasedReserved = 0;
  const custodyRows = [];
  for (const r of pool) {
    const rUnit = r.unit || stockUnit;
    const factorRes = convertQuantity(1, rUnit, stockUnit, { item: inv, itemId, rules });
    const toStockFactor = factorRes.ok ? factorRes.factor : 1;
    if (r.status === 'reserved') {
      unreleasedReserved += (Number(r.quantity_reserved) || 0) * toStockFactor;
    } else if (r.status === 'consumed') {
      const remRaw = r.custody_quantity != null
        ? Number(r.custody_quantity)
        : Math.max(0, (Number(r.actual_quantity) || 0) - (Number(r.custody_consumed_quantity) || 0));
      if (remRaw > 0) {
        const remInStockUnit = remRaw * toStockFactor;
        custody += remInStockUnit;
        custodyRows.push({
          reservation: r,
          remainingRaw: remRaw,
          remaining: remInStockUnit,
          unit: rUnit,
          toStockFactor,
        });
      }
    }
  }
  // Also include completed sub-recipe batches produced specifically into this event's custody
  const subBatches = await db.ProductionOrder.filter({
    catering_event_id: eventId,
    output_item_id: itemId,
    status: 'completed',
  });
  const subCustodyRows = [];
  for (const sb of subBatches) {
    const remRaw = sb.custody_output_quantity != null ? Number(sb.custody_output_quantity) : 0;
    if (remRaw > 0) {
      const sbUnit = sb.output_unit || stockUnit;
      const factorRes = convertQuantity(1, sbUnit, stockUnit, { item: inv, itemId, rules });
      const toStockFactor = factorRes.ok ? factorRes.factor : 1;
      const remInStockUnit = remRaw * toStockFactor;
      custody += remInStockUnit;
      subCustodyRows.push({
        order: sb,
        remainingRaw: remRaw,
        remaining: remInStockUnit,
        unit: sbUnit,
        toStockFactor,
      });
    }
  }
  return {
    inv,
    custody: round(custody),
    unreleasedReserved: round(unreleasedReserved),
    custodyRows,
    subCustodyRows,
    stockUnit,
  };
}

export async function recipesByOutput(db) {
  const all = await db.Recipe.filter({ status: 'active' });
  const map = {};
  for (const r of all) if (r.output_item_id) map[r.output_item_id] = r;
  return map;
}

/**
 * Strictly resolves a production order's recipe by:
 *  1) saved `order.recipe_id` (must exist and contain at least one ingredient), or
 *  2) an unambiguous active recipe for `order.output_item_id` (never inferred by recipe_name).
 */
export async function resolveOrderRecipeStrict(db, order) {
  if (!order) {
    return { recipe: null, source: 'missing_order', error: 'Production order is missing' };
  }
  if (order.recipe_id) {
    const direct = await db.Recipe.get(order.recipe_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (direct && Array.isArray(direct.ingredients) && direct.ingredients.length > 0) {
      return { recipe: direct, source: 'recipe_id', error: null };
    }
  }
  if (order.output_item_id) {
    const byOut = await db.Recipe.filter({ output_item_id: order.output_item_id, status: 'active' });
    const branchScoped = order.branch_id
      ? byOut.filter((r) => !r.branch_id || r.branch_id === order.branch_id)
      : byOut;
    const candidates = (branchScoped.length > 0 ? branchScoped : byOut).filter(
      (r) => Array.isArray(r.ingredients) && r.ingredients.length > 0
    );
    if (candidates.length === 1) {
      return { recipe: candidates[0], source: 'output_item_id', error: null };
    }
    if (candidates.length > 1) {
      return {
        recipe: null,
        source: 'ambiguous_output_item',
        error: `Multiple active recipes match output item "${order.output_item_name || order.output_item_id}". Keep a single active recipe for this output item before completing.`,
      };
    }
  }
  return {
    recipe: null,
    source: 'missing',
    error: `Recipe "${order.recipe_name || order.recipe_id}" no longer exists and no active recipe is mapped to output item "${order.output_item_name || 'unknown'}".`,
  };
}

export async function resolveOrderRecipe(db, order) {
  const res = await resolveOrderRecipeStrict(db, order);
  return res.recipe;
}

// Returns { shortages: raw items, subShortages: sub-recipe items }. `localize` maps a recipe's item
// to the one the event's branch uses (eventItemLocalizer); without it items are used as they are.
export async function computeShortages(db, recipe, batches, ownOrderId, eventId = null, localize = null) {
  const [byOutput, rules] = await Promise.all([
    recipesByOutput(db),
    loadConversionRules(db),
  ]);
  const rawNeed = {};   // itemId -> { qtyInStockUnit, rawEntries, name, stockUnit, via:Set, conversionError }
  const subShortages = [];

  const availableFor = async (itemId) => {
    if (eventId) {
      const { inv, custody, unreleasedReserved, stockUnit } = await eventCustodyStock(db, itemId, eventId, ownOrderId, rules);
      return { inv, available: custody, unreleasedReserved, isCustody: true, stockUnit };
    }
    const { inv, free, stockUnit } = await freeStock(db, itemId, ownOrderId, rules);
    return { inv, available: free, unreleasedReserved: 0, isCustody: false, stockUnit };
  };

  const expand = async (rec, b, path, via) => {
    if (path.includes(rec.id)) throw new Error(`Circular recipe reference: ${rec.name}`);
    if (path.length > MAX_DEPTH) throw new Error('Recipe nesting is too deep');
    for (const ing of rec.ingredients || []) {
      const qty = (Number(ing.quantity_needed) || 0) * b;
      if (qty <= 0) continue;
      const itemId = localize ? await localize(ing.inventory_item_id) : ing.inventory_item_id;
      const sub = byOutput[ing.inventory_item_id];
      if (sub && sub.id !== rec.id) {
        const { inv, available, stockUnit } = await availableFor(itemId);
        const subUnit = sub.output_unit || stockUnit || ing.unit || '';
        const ingToSub = convertQuantity(qty, ing.unit || subUnit, subUnit, { item: inv, itemId, rules });
        const neededInSubUnit = ingToSub.ok ? ingToSub.quantity : qty;
        const availToSub = convertQuantity(available, stockUnit || subUnit, subUnit, { item: inv, itemId, rules });
        const availInSubUnit = availToSub.ok ? availToSub.quantity : available;
        const missing = round(neededInSubUnit - availInSubUnit);
        if (missing > 0) {
          const subBatches = Math.ceil(missing / (sub.output_quantity || 1));
          subShortages.push({
            inventory_item_id: itemId,
            inventory_item_name: ing.inventory_item_name || inv?.name || sub.output_item_name,
            unit: subUnit,
            quantity_needed: round(neededInSubUnit),
            quantity_available: round(availInSubUnit),
            quantity_missing: missing,
            sub_recipe_id: sub.id,
            sub_recipe_name: sub.name,
            sub_batches: subBatches,
            via: via || null,
          });
          await expand(sub, subBatches, [...path, rec.id], sub.name);
        }
      } else {
        const inv = await db.InventoryItem.get(itemId).catch(() => null);
        const stockUnit = getItemStockUnit(inv) || ing.unit || '';
        const conv = toStockQuantity(qty, ing.unit || stockUnit, inv, rules);
        const e = (rawNeed[itemId] ||= {
          qty: 0,
          name: ing.inventory_item_name || inv?.name || 'Unknown',
          unit: stockUnit,
          recipeQty: 0,
          recipeUnit: ing.unit || stockUnit,
          via: new Set(),
          conversionError: null,
        });
        if (!conv.ok) {
          e.conversionError = conv.message;
          e.qty += qty;
        } else {
          e.qty += conv.quantity;
        }
        e.recipeQty += qty;
        if (via) e.via.add(via);
      }
    }
  };
  await expand(recipe, batches, [], null);

  const shortages = [];
  for (const [id, e] of Object.entries(rawNeed)) {
    const { inv, available, unreleasedReserved, isCustody, stockUnit } = await availableFor(id);
    if (e.conversionError) {
      shortages.push({
        inventory_item_id: id,
        inventory_item_name: e.name || inv?.name || 'Unknown',
        quantity_needed: round(e.recipeQty),
        quantity_available: round(available),
        quantity_requested: round(e.recipeQty),
        unreleased_reserved: round(unreleasedReserved || 0),
        awaiting_requisition_release: false,
        unit: e.recipeUnit || stockUnit || '',
        conversion_error: e.conversionError,
        for_sub_recipes: [...e.via],
      });
      continue;
    }
    if (available + 1e-9 < e.qty) {
      shortages.push({
        inventory_item_id: id,
        inventory_item_name: e.name || inv?.name || 'Unknown',
        quantity_needed: round(e.qty),
        quantity_available: round(available),
        quantity_requested: round(e.qty - available),
        unreleased_reserved: round(unreleasedReserved || 0),
        awaiting_requisition_release: isCustody && (unreleasedReserved || 0) + 1e-9 >= round(e.qty - available),
        unit: stockUnit || e.unit || inv?.unit || '',
        recipe_quantity_needed: normalizeUnit(e.recipeUnit) !== normalizeUnit(stockUnit) ? round(e.recipeQty) : undefined,
        recipe_unit: normalizeUnit(e.recipeUnit) !== normalizeUnit(stockUnit) ? e.recipeUnit : undefined,
        for_sub_recipes: [...e.via],
      });
    }
  }
  return { shortages, subShortages };
}