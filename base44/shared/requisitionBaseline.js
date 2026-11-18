import { readAll, roundMoney } from './cateringActualCostCommon.js';
import { convertQuantity, getItemStockUnit, loadConversionRules, normalizeUnit } from './unitConversion.js';

const normName = (s) => String(s || '').trim().toLowerCase();

export const baselineItemKey = (item) =>
  `${item.inventory_item_id}|${item.purpose || 'stock_pull'}|${item.produced_item_name || ''}`;

function hasStockableRecipe(mi) {
  return Array.isArray(mi?.recipe) && mi.recipe.some((r) => r.inventory_item_id && Number(r.quantity_needed) > 0);
}

/**
 * Pure calculation of the system-generated minimum requirements for a quote + guest count.
 * Mirrors the exact explosion rule in src/components/catering/productionPlanning.js:
 *  - menu items linked to an active manufacturing Recipe become production batches and explode their recipe ingredients;
 *  - other menu items with a recipe become direct stock pulls;
 *  - package material_requirements template items are added as stock pulls.
 */
export async function computeQuoteBaselineItems(svc, event, quote) {
  if (!event || !quote) return [];
  const guests = Number(event.guarantee_locked ? event.guaranteed_guests : (quote.guests_at_quote || event.expected_guests)) || 0;

  const [menuItems, recipes, pkg, inventoryItems] = await Promise.all([
    readAll(svc.entities.MenuItem, {}),
    readAll(svc.entities.Recipe, {}),
    quote.package_id ? svc.entities.CateringPackage.get(quote.package_id).catch(() => null) : null,
    readAll(svc.entities.InventoryItem, event.branch_id ? { branch_id: event.branch_id } : {}),
  ]);

  const activeRecipes = recipes.filter((r) => r.status !== 'inactive');
  const invById = new Map(inventoryItems.map((i) => [i.id, i]));
  const needs = new Map();

  for (const li of quote.line_items || []) {
    const qty = Number(li.quantity) || 0;
    if (qty <= 0 || li.manually_sourced) continue;
    const mi = li.menu_item_id ? menuItems.find((m) => m.id === li.menu_item_id) : null;
    if (!hasStockableRecipe(mi)) continue;

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
        name: linkedRecipe.output_item_name || mi.name || '',
        unit: linkedRecipe.output_unit || 'portion',
        qty: 0,
      };
      needs.set(id, { ...prev, qty: prev.qty + qty });
      continue;
    }

    for (const ing of mi.recipe || []) {
      const id = ing.inventory_item_id;
      if (!id) continue;
      const add = (Number(ing.quantity_needed) || 0) * qty;
      const prev = needs.get(id) || {
        inventory_item_id: id,
        name: ing.inventory_item_name || '',
        unit: ing.unit || '',
        qty: 0,
      };
      needs.set(id, { ...prev, qty: prev.qty + add });
    }
  }

  // Package material_requirements template
  for (const r of pkg?.material_requirements || []) {
    if (!r.inventory_item_id) continue;
    const qty = Number(r.quantity) || 0;
    const divisor = Number(r.per_guest_divisor) || 1;
    const resolved = r.scaling_mode === 'per_guest' ? Math.ceil(guests / divisor) * qty : qty;
    if (!(resolved > 0)) continue;
    const prev = needs.get(r.inventory_item_id);
    if (prev) {
      needs.set(r.inventory_item_id, { ...prev, qty: roundMoney(prev.qty + resolved) });
    } else {
      const inv = invById.get(r.inventory_item_id);
      needs.set(r.inventory_item_id, {
        inventory_item_id: r.inventory_item_id,
        name: r.inventory_item_name || inv?.name || '',
        unit: getItemStockUnit(inv) || '',
        qty: roundMoney(resolved),
      });
    }
  }

  const baselineMap = new Map();
  const addLine = (row) => {
    if (!row.inventory_item_id || !(row.minimum_quantity > 0)) return;
    const inv = invById.get(row.inventory_item_id);
    const unit = row.unit || getItemStockUnit(inv) || '';
    const entry = {
      key: baselineItemKey(row),
      inventory_item_id: row.inventory_item_id,
      inventory_item_name: row.inventory_item_name || inv?.name || '',
      unit,
      purpose: row.purpose || 'stock_pull',
      produced_item_name: row.produced_item_name || '',
      minimum_quantity: roundMoney(row.minimum_quantity),
    };
    const existing = baselineMap.get(entry.key);
    if (existing) {
      existing.minimum_quantity = roundMoney(existing.minimum_quantity + entry.minimum_quantity);
    } else {
      baselineMap.set(entry.key, entry);
    }
  };

  for (const need of needs.values()) {
    const recipe = activeRecipes.find((r) => r.output_item_id === need.inventory_item_id);
    if (!recipe) {
      addLine({
        inventory_item_id: need.inventory_item_id,
        inventory_item_name: need.name,
        unit: need.unit,
        purpose: 'stock_pull',
        produced_item_name: '',
        minimum_quantity: roundMoney(need.qty),
      });
      continue;
    }
    const perBatch = Number(recipe.output_quantity) || 1;
    const batches = Math.ceil(roundMoney(need.qty) / perBatch);
    for (const ing of recipe.ingredients || []) {
      addLine({
        inventory_item_id: ing.inventory_item_id,
        inventory_item_name: ing.inventory_item_name || '',
        unit: ing.unit || '',
        purpose: 'production_input',
        produced_item_name: recipe.output_item_name || need.name || '',
        minimum_quantity: roundMoney((Number(ing.quantity_needed) || 0) * batches),
      });
    }
  }

  return [...baselineMap.values()].sort((a, b) =>
    String(a.inventory_item_name).localeCompare(String(b.inventory_item_name))
  );
}

/**
 * Snapshot the latest approved quote's system-calculated minimum quantities onto the CateringEvent,
 * and update system_minimum_quantity on any active planned requisition lines for that event.
 */
export async function refreshEventRequisitionBaseline(svc, event, quoteArg = null) {
  if (!event?.id) return [];
  const quote =
    quoteArg ||
    (event.active_quote_id
      ? await svc.entities.CateringQuote.get(event.active_quote_id).catch(() => null)
      : null);
  if (!quote) return event.requisition_baseline_items || [];

  const baselineItems = await computeQuoteBaselineItems(svc, event, quote);
  const now = new Date().toISOString();
  await svc.entities.CateringEvent.update(event.id, {
    requisition_baseline_quote_id: quote.id,
    requisition_baseline_quote_revision: Number(quote.revision_number) || 1,
    requisition_baseline_updated_at: now,
    requisition_baseline_items: baselineItems,
  });

  // Also stamp system_minimum_quantity onto active planned RequisitionLines of the primary requisition
  const byKey = new Map(baselineItems.map((b) => [b.key, b]));
  const byItemId = new Map(baselineItems.map((b) => [b.inventory_item_id, b]));
  const reqs = (await svc.entities.Requisition.filter({ event_id: event.id })).filter(
    (r) => r.status !== 'cancelled' && !r.is_additional
  );
  for (const r of reqs) {
    const lines = (await readAll(svc.entities.RequisitionLine, { requisition_id: r.id })).filter(
      (l) => l.is_active !== false && l.line_type === 'planned'
    );
    const updates = [];
    for (const l of lines) {
      const match = byKey.get(baselineItemKey(l)) || byItemId.get(l.inventory_item_id);
      if (match && Number(l.system_minimum_quantity) !== Number(match.minimum_quantity)) {
        updates.push({ id: l.id, system_minimum_quantity: match.minimum_quantity });
      }
    }
    if (updates.length) await svc.entities.RequisitionLine.bulkUpdate(updates);
  }

  return baselineItems;
}

/**
 * Compare confirmed/scheduled/fulfilled requisition quantities against the latest approved baseline
 * for an event. Converts units when necessary.
 * Returns { baselineItems, confirmedByKey, shortfalls, openRequestedByKey }.
 */
export async function computeEventBaselineComparison(svc, event, { requisitions: reqsArg = null, lines: linesArg = null, unitRules: rulesArg = null } = {}) {
  const quote = event?.active_quote_id
    ? await svc.entities.CateringQuote.get(event.active_quote_id).catch(() => null)
    : null;

  let baselineItems = Array.isArray(event?.requisition_baseline_items) ? event.requisition_baseline_items : [];
  if (
    quote &&
    (!baselineItems.length ||
      event.requisition_baseline_quote_id !== quote.id ||
      Number(event.requisition_baseline_quote_revision) !== Number(quote.revision_number))
  ) {
    baselineItems = await refreshEventRequisitionBaseline(svc, event, quote);
  }

  const requisitions = reqsArg || (await svc.entities.Requisition.filter({ event_id: event.id }));
  const nonCancelled = requisitions.filter((r) => r.status !== 'cancelled');
  const confirmedReqIds = new Set(
    nonCancelled.filter((r) => ['confirmed', 'scheduled', 'fulfilled'].includes(r.status)).map((r) => r.id)
  );
  const openReqIds = new Set(
    nonCancelled.filter((r) => ['draft', 'pending_approval', 'submitted', 'replied'].includes(r.status)).map((r) => r.id)
  );

  const allLines =
    linesArg ||
    (nonCancelled.length
      ? await readAll(svc.entities.RequisitionLine, { event_id: event.id })
      : []);
  const activeLines = allLines.filter((l) => l.is_active !== false);
  const unitRules = rulesArg || (await loadConversionRules(svc));

  // Sum confirmed quantities per item (across all confirmed/scheduled/fulfilled requisitions for the event)
  const confirmedByItem = new Map();
  const openByItem = new Map();

  const addConverted = (map, itemId, targetUnit, rawQty, rawUnit) => {
    if (!(rawQty > 0)) return;
    let qty = rawQty;
    if (targetUnit && rawUnit && normalizeUnit(targetUnit) !== normalizeUnit(rawUnit)) {
      const conv = convertQuantity(rawQty, rawUnit, targetUnit, { itemId, rules: unitRules });
      if (conv.ok) qty = conv.quantity;
    }
    map.set(itemId, roundMoney((map.get(itemId) || 0) + qty));
  };

  // Map baseline unit per item
  const baselineUnitByItem = new Map(baselineItems.map((b) => [b.inventory_item_id, b.unit]));

  for (const l of activeLines) {
    const targetUnit = baselineUnitByItem.get(l.inventory_item_id) || l.unit || '';
    if (confirmedReqIds.has(l.requisition_id)) {
      const agreed = l.is_agreed ? Number(l.agreed_quantity) || 0 : 0;
      addConverted(confirmedByItem, l.inventory_item_id, targetUnit, agreed, l.unit);
    } else if (openReqIds.has(l.requisition_id)) {
      const openQty =
        l.inventory_decision === 'declined' && l.is_agreed
          ? 0
          : Number(l.is_agreed ? l.agreed_quantity : l.requested_quantity) || 0;
      addConverted(openByItem, l.inventory_item_id, targetUnit, openQty, l.unit);
    }
  }

  // Aggregate baseline items by inventory_item_id so multi-purpose lines for the same item compare cleanly
  const aggregatedBaseline = new Map();
  for (const b of baselineItems) {
    const prev = aggregatedBaseline.get(b.inventory_item_id);
    if (prev) {
      prev.minimum_quantity = roundMoney(prev.minimum_quantity + (Number(b.minimum_quantity) || 0));
    } else {
      aggregatedBaseline.set(b.inventory_item_id, { ...b, minimum_quantity: roundMoney(Number(b.minimum_quantity) || 0) });
    }
  }

  const comparison = [];
  const shortfalls = [];
  for (const b of aggregatedBaseline.values()) {
    const confirmedQty = confirmedByItem.get(b.inventory_item_id) || 0;
    const openQty = openByItem.get(b.inventory_item_id) || 0;
    const shortfall = Math.max(0, roundMoney(b.minimum_quantity - confirmedQty));
    const uncoveredShortfall = Math.max(0, roundMoney(b.minimum_quantity - confirmedQty - openQty));
    const entry = {
      ...b,
      confirmed_quantity: confirmedQty,
      open_requested_quantity: openQty,
      shortfall_quantity: shortfall,
      uncovered_shortfall_quantity: uncoveredShortfall,
    };
    comparison.push(entry);
    if (shortfall > 0) {
      shortfalls.push(entry);
    }
  }

  return {
    quoteRevision: quote?.revision_number || event?.requisition_baseline_quote_revision || null,
    baselineItems: comparison,
    shortfalls,
  };
}