// Centralized server-side Unit Conversion Engine for backend functions.
// Mirrors src/lib/unitConversion.js and provides loadConversionRules(entitiesOrSvc) for server queries.

export const DIMENSION_LABELS = {
  mass: 'Weight / Mass',
  volume: 'Volume / Liquid',
  count: 'Count / Packaging',
  custom: 'Custom Unit',
};

export const BUILTIN_UNITS = [
  { code: 'kg', label: 'Kilogram (kg)', dimension: 'mass', baseUnit: 'kg', toBaseFactor: 1, aliases: ['kg', 'kilo', 'kilos', 'kilogram', 'kilograms', 'كجم', 'كيلو', 'كيلوجرام'] },
  { code: 'g', label: 'Gram (g)', dimension: 'mass', baseUnit: 'kg', toBaseFactor: 0.001, aliases: ['g', 'gm', 'gr', 'gram', 'grams', 'جرام', 'غ', 'غرام'] },
  { code: 'mg', label: 'Milligram (mg)', dimension: 'mass', baseUnit: 'kg', toBaseFactor: 0.000001, aliases: ['mg', 'milligram', 'milligrams', 'ملجم'] },
  { code: 'lb', label: 'Pound (lb)', dimension: 'mass', baseUnit: 'kg', toBaseFactor: 0.45359237, aliases: ['lb', 'lbs', 'pound', 'pounds', 'رطل'] },
  { code: 'oz', label: 'Ounce (oz)', dimension: 'mass', baseUnit: 'kg', toBaseFactor: 0.028349523125, aliases: ['oz', 'ounce', 'ounces', 'أوقية'] },

  { code: 'l', label: 'Liter (l)', dimension: 'volume', baseUnit: 'l', toBaseFactor: 1, aliases: ['l', 'lt', 'ltr', 'liter', 'litre', 'liters', 'litres', 'لتر'] },
  { code: 'ml', label: 'Milliliter (ml)', dimension: 'volume', baseUnit: 'l', toBaseFactor: 0.001, aliases: ['ml', 'milliliter', 'millilitre', 'milliliters', 'millilitres', 'مل', 'ملي'] },
  { code: 'cup', label: 'Cup (cup)', dimension: 'volume', baseUnit: 'l', toBaseFactor: 0.24, aliases: ['cup', 'cups', 'كوب'] },
  { code: 'tbsp', label: 'Tablespoon (tbsp)', dimension: 'volume', baseUnit: 'l', toBaseFactor: 0.015, aliases: ['tbsp', 'tablespoon', 'tablespoons', 'ملعقة كبيرة'] },
  { code: 'tsp', label: 'Teaspoon (tsp)', dimension: 'volume', baseUnit: 'l', toBaseFactor: 0.005, aliases: ['tsp', 'teaspoon', 'teaspoons', 'ملعقة صغيرة'] },
  { code: 'gal', label: 'Gallon (gal)', dimension: 'volume', baseUnit: 'l', toBaseFactor: 3.785411784, aliases: ['gal', 'gallon', 'gallons', 'جالون'] },

  { code: 'pcs', label: 'Piece (pcs)', dimension: 'count', baseUnit: 'pcs', toBaseFactor: 1, aliases: ['pcs', 'pc', 'piece', 'pieces', 'unit', 'units', 'each', 'قطعة', 'حبة', 'عدد'] },
  { code: 'portion', label: 'Portion / Serving', dimension: 'count', baseUnit: 'portion', toBaseFactor: 1, aliases: ['portion', 'portions', 'serving', 'servings', 'حصة', 'بورش'] },
  { code: 'pack', label: 'Pack / Packet', dimension: 'count', baseUnit: 'pack', toBaseFactor: 1, aliases: ['pack', 'packs', 'packet', 'packets', 'باكو', 'عبوة'] },
  { code: 'box', label: 'Box', dimension: 'count', baseUnit: 'box', toBaseFactor: 1, aliases: ['box', 'boxes', 'صندوق', 'علبة'] },
  { code: 'carton', label: 'Carton / Case', dimension: 'count', baseUnit: 'carton', toBaseFactor: 1, aliases: ['carton', 'cartons', 'case', 'cases', 'كرتونة', 'كرتون'] },
  { code: 'bottle', label: 'Bottle', dimension: 'count', baseUnit: 'bottle', toBaseFactor: 1, aliases: ['bottle', 'bottles', 'زجاجة'] },
  { code: 'can', label: 'Can / Tin', dimension: 'count', baseUnit: 'can', toBaseFactor: 1, aliases: ['can', 'cans', 'tin', 'tins', 'كانز'] },
  { code: 'bag', label: 'Bag / Sack', dimension: 'count', baseUnit: 'bag', toBaseFactor: 1, aliases: ['bag', 'bags', 'sack', 'sacks', 'كيس', 'شوال'] },
  { code: 'roll', label: 'Roll', dimension: 'count', baseUnit: 'roll', toBaseFactor: 1, aliases: ['roll', 'rolls', 'رول', 'بكرة'] },
  { code: 'tray', label: 'Tray', dimension: 'count', baseUnit: 'tray', toBaseFactor: 1, aliases: ['tray', 'trays', 'طبق'] },
];

export const DEFAULT_GLOBAL_PAIRS = [
  { id: 'builtin-kg-g', scope: 'global', from_unit: 'kg', to_unit: 'g', factor: 1000, dimension_mode: 'same_dimension', bidirectional: true, is_builtin: true, is_active: true },
  { id: 'builtin-g-mg', scope: 'global', from_unit: 'g', to_unit: 'mg', factor: 1000, dimension_mode: 'same_dimension', bidirectional: true, is_builtin: true, is_active: true },
  { id: 'builtin-lb-g', scope: 'global', from_unit: 'lb', to_unit: 'g', factor: 453.59237, dimension_mode: 'same_dimension', bidirectional: true, is_builtin: true, is_active: true },
  { id: 'builtin-oz-g', scope: 'global', from_unit: 'oz', to_unit: 'g', factor: 28.349523, dimension_mode: 'same_dimension', bidirectional: true, is_builtin: true, is_active: true },
  { id: 'builtin-l-ml', scope: 'global', from_unit: 'l', to_unit: 'ml', factor: 1000, dimension_mode: 'same_dimension', bidirectional: true, is_builtin: true, is_active: true },
  { id: 'builtin-cup-ml', scope: 'global', from_unit: 'cup', to_unit: 'ml', factor: 240, dimension_mode: 'same_dimension', bidirectional: true, is_builtin: true, is_active: true },
  { id: 'builtin-tbsp-ml', scope: 'global', from_unit: 'tbsp', to_unit: 'ml', factor: 15, dimension_mode: 'same_dimension', bidirectional: true, is_builtin: true, is_active: true },
  { id: 'builtin-tsp-ml', scope: 'global', from_unit: 'tsp', to_unit: 'ml', factor: 5, dimension_mode: 'same_dimension', bidirectional: true, is_builtin: true, is_active: true },
  { id: 'builtin-gal-l', scope: 'global', from_unit: 'gal', to_unit: 'l', factor: 3.785412, dimension_mode: 'same_dimension', bidirectional: true, is_builtin: true, is_active: true },
];

const aliasMap = new Map();
const unitByCode = new Map();

function rebuildServerUnitMaps(records = []) {
  aliasMap.clear();
  unitByCode.clear();

  for (const u of BUILTIN_UNITS) {
    unitByCode.set(u.code, { ...u, aliases: [...(u.aliases || [])] });
    aliasMap.set(u.code.toLowerCase(), u.code);
    for (const a of u.aliases) {
      aliasMap.set(String(a).trim().toLowerCase(), u.code);
    }
  }

  for (const rec of Array.isArray(records) ? records : []) {
    if (!rec) continue;
    const rawCanonical = String(rec.canonical_label || rec.symbol || "").trim();
    if (!rawCanonical) continue;
    const canonicalCode = String(rec.symbol || rawCanonical).trim().toLowerCase();
    const existing = unitByCode.get(canonicalCode) || unitByCode.get(rawCanonical.toLowerCase());
    const targetCode = existing ? existing.code : canonicalCode;

    const mergedAliases = new Set([
      targetCode,
      rawCanonical.toLowerCase(),
      ...(existing?.aliases || []),
      ...(Array.isArray(rec.aliases) ? rec.aliases : []),
      ...(rec.arabic_label ? [rec.arabic_label] : []),
      ...(rec.symbol ? [rec.symbol] : []),
    ].map((a) => String(a || "").trim()).filter(Boolean));

    const updated = {
      code: targetCode,
      label: rec.display_name || existing?.label || rawCanonical,
      dimension: rec.dimension || existing?.dimension || 'custom',
      baseUnit: existing?.baseUnit || targetCode,
      toBaseFactor: existing?.toBaseFactor ?? 1,
      aliases: [...mergedAliases],
    };

    unitByCode.set(targetCode, updated);
    aliasMap.set(targetCode.toLowerCase(), targetCode);
    aliasMap.set(rawCanonical.toLowerCase(), targetCode);
    for (const a of updated.aliases) {
      const clean = String(a || "").trim().toLowerCase();
      if (clean) aliasMap.set(clean, targetCode);
    }
  }
}

rebuildServerUnitMaps([]);

export function registerServerUnitCatalog(records = []) {
  rebuildServerUnitMaps(records);
}

export function roundQty(n, decimals = 6) {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  const f = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * f) / f;
}

export function normalizeUnit(raw) {
  const cleaned = String(raw || '').trim().toLowerCase();
  if (!cleaned) return '';
  return aliasMap.get(cleaned) || cleaned;
}

export function getUnitMeta(raw) {
  const code = normalizeUnit(raw);
  if (!code) return null;
  return unitByCode.get(code) || {
    code,
    label: String(raw || code).trim(),
    dimension: 'custom',
    baseUnit: code,
    toBaseFactor: 1,
    aliases: [code],
  };
}

export function getUnitDimension(raw) {
  return getUnitMeta(raw)?.dimension || 'custom';
}

export function areDimensionsCompatible(unitA, unitB) {
  const dimA = getUnitDimension(unitA);
  const dimB = getUnitDimension(unitB);
  if (dimA === 'custom' || dimB === 'custom') return true;
  return dimA === dimB;
}

export function getItemStockUnit(item) {
  if (!item) return '';
  const explicit = String(item.selling_unit_label || item.unit || '').trim();
  if (explicit) return explicit;
  return item.selling_unit === 'weight' ? 'kg' : 'pcs';
}

export function getItemCostUnit(item) {
  if (!item) return '';
  const explicit = String(item.purchase_unit_label || item.unit || item.selling_unit_label || '').trim();
  if (explicit) return explicit;
  return item.purchase_unit === 'weight' ? 'kg' : 'pcs';
}

export async function loadConversionRules(entitiesOrSvc) {
  const entities = entitiesOrSvc?.entities || entitiesOrSvc;
  if (entities?.UnitDefinition) {
    try {
      const unitDefs = await entities.UnitDefinition.list('canonical_label', 500);
      if (Array.isArray(unitDefs)) {
        registerServerUnitCatalog(unitDefs);
      }
    } catch {
      // Fall back to built-in unit definitions if UnitDefinition cannot be read
    }
  }
  if (!entities?.UnitConversionRule) return [];
  try {
    const list = await entities.UnitConversionRule.list('-created_date', 500);
    return Array.isArray(list) ? list.filter((r) => r && r.is_active !== false) : [];
  } catch {
    return [];
  }
}

function buildEdges(rules = [], targetItemId = null) {
  const activeRules = (Array.isArray(rules) ? rules : []).filter((r) => r && r.is_active !== false);
  const itemEdges = [];
  const globalCustomEdges = [];
  const builtinEdges = [];

  if (targetItemId) {
    for (const r of activeRules) {
      if (r.scope === 'item' && String(r.inventory_item_id || '') === String(targetItemId)) {
        const from = normalizeUnit(r.from_unit);
        const to = normalizeUnit(r.to_unit);
        const factor = Number(r.factor);
        if (!from || !to || from === to || !(factor > 0)) continue;
        itemEdges.push({ from, to, factor, source: 'item_rule', ruleId: r.id || null, label: `${r.inventory_item_name || 'Item'}: 1 ${from} = ${factor} ${to}` });
        if (r.bidirectional !== false) {
          itemEdges.push({ from: to, to: from, factor: 1 / factor, source: 'item_rule_inverse', ruleId: r.id || null, label: `${r.inventory_item_name || 'Item'}: 1 ${to} = ${roundQty(1 / factor, 6)} ${from}` });
        }
      }
    }
  }

  for (const r of activeRules) {
    if (r.scope === 'global' && !r.is_builtin) {
      const from = normalizeUnit(r.from_unit);
      const to = normalizeUnit(r.to_unit);
      const factor = Number(r.factor);
      if (!from || !to || from === to || !(factor > 0)) continue;
      if (!areDimensionsCompatible(from, to)) continue;
      globalCustomEdges.push({ from, to, factor, source: 'global_rule', ruleId: r.id || null, label: `Global: 1 ${from} = ${factor} ${to}` });
      if (r.bidirectional !== false) {
        globalCustomEdges.push({ from: to, to: from, factor: 1 / factor, source: 'global_rule_inverse', ruleId: r.id || null, label: `Global: 1 ${to} = ${roundQty(1 / factor, 6)} ${from}` });
      }
    }
  }

  for (const r of DEFAULT_GLOBAL_PAIRS) {
    const from = normalizeUnit(r.from_unit);
    const to = normalizeUnit(r.to_unit);
    const factor = Number(r.factor);
    builtinEdges.push({ from, to, factor, source: 'builtin', ruleId: r.id, label: `Built-in: 1 ${from} = ${factor} ${to}` });
    if (r.bidirectional !== false) {
      builtinEdges.push({ from: to, to: from, factor: 1 / factor, source: 'builtin_inverse', ruleId: r.id, label: `Built-in: 1 ${to} = ${roundQty(1 / factor, 6)} ${from}` });
    }
  }

  return { itemEdges, globalCustomEdges, builtinEdges };
}

export function resolveConversionFactor(fromUnit, toUnit, options = {}) {
  const normFrom = normalizeUnit(fromUnit);
  const normTo = normalizeUnit(toUnit);
  const item = options.item || null;
  const targetItemId = options.itemId || item?.id || null;
  const rules = options.rules || [];

  if (!normFrom || !normTo) {
    return {
      ok: false,
      error: 'unit_missing',
      message: `Missing unit (${fromUnit || 'none'} → ${toUnit || 'none'})`,
      fromUnit: normFrom,
      toUnit: normTo,
    };
  }

  if (normFrom === normTo) {
    return {
      ok: true,
      factor: 1,
      fromUnit: normFrom,
      toUnit: normTo,
      source: 'same_unit',
      steps: [],
    };
  }

  const { itemEdges, globalCustomEdges, builtinEdges } = buildEdges(rules, targetItemId);

  const directItem = itemEdges.filter((e) => e.from === normFrom && e.to === normTo);
  if (directItem.length > 0) {
    const firstFactor = directItem[0].factor;
    const conflict = directItem.some((e) => Math.abs(e.factor - firstFactor) / firstFactor > 1e-6);
    if (conflict) {
      return {
        ok: false,
        error: 'ambiguous_conversion',
        message: `Conflicting item-specific conversion rules exist between ${normFrom} and ${normTo}`,
        fromUnit: normFrom,
        toUnit: normTo,
      };
    }
    return {
      ok: true,
      factor: firstFactor,
      fromUnit: normFrom,
      toUnit: normTo,
      source: 'item_rule',
      steps: [directItem[0].label],
    };
  }

  const directGlobal = globalCustomEdges.filter((e) => e.from === normFrom && e.to === normTo);
  if (directGlobal.length > 0) {
    const firstFactor = directGlobal[0].factor;
    const conflict = directGlobal.some((e) => Math.abs(e.factor - firstFactor) / firstFactor > 1e-6);
    if (conflict) {
      return {
        ok: false,
        error: 'ambiguous_conversion',
        message: `Conflicting global conversion rules exist between ${normFrom} and ${normTo}`,
        fromUnit: normFrom,
        toUnit: normTo,
      };
    }
    return {
      ok: true,
      factor: firstFactor,
      fromUnit: normFrom,
      toUnit: normTo,
      source: 'global_rule',
      steps: [directGlobal[0].label],
    };
  }

  const metaFrom = unitByCode.get(normFrom);
  const metaTo = unitByCode.get(normTo);
  if (metaFrom && metaTo && metaFrom.baseUnit === metaTo.baseUnit && metaFrom.toBaseFactor > 0 && metaTo.toBaseFactor > 0) {
    const hasCustomOverride = globalCustomEdges.some(
      (e) => e.from === normFrom || e.to === normFrom || e.from === normTo || e.to === normTo
    );
    if (!hasCustomOverride) {
      const factor = metaFrom.toBaseFactor / metaTo.toBaseFactor;
      return {
        ok: true,
        factor,
        fromUnit: normFrom,
        toUnit: normTo,
        source: 'builtin',
        steps: [`Built-in metric (${normFrom} → ${normTo})`],
      };
    }
  }

  const allEdges = [...itemEdges, ...globalCustomEdges, ...builtinEdges];
  const adj = new Map();
  for (const edge of allEdges) {
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    adj.get(edge.from).push(edge);
  }

  const queue = [{ unit: normFrom, factor: 1, steps: [], sources: new Set() }];
  const visited = new Map([[normFrom, 1]]);

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = adj.get(current.unit) || [];
    for (const edge of neighbors) {
      const nextFactor = current.factor * edge.factor;
      if (edge.to === normTo) {
        const nextSources = new Set(current.sources);
        nextSources.add(edge.source);
        const primarySource =
          nextSources.has('item_rule') || nextSources.has('item_rule_inverse')
            ? 'item_rule'
            : nextSources.has('global_rule') || nextSources.has('global_rule_inverse')
            ? 'global_rule'
            : 'builtin';
        return {
          ok: true,
          factor: nextFactor,
          fromUnit: normFrom,
          toUnit: normTo,
          source: primarySource,
          steps: [...current.steps, edge.label],
        };
      }
      if (!visited.has(edge.to)) {
        visited.set(edge.to, nextFactor);
        const nextSources = new Set(current.sources);
        nextSources.add(edge.source);
        queue.push({
          unit: edge.to,
          factor: nextFactor,
          steps: [...current.steps, edge.label],
          sources: nextSources,
        });
      }
    }
  }

  return {
    ok: false,
    error: 'unit_conversion_unavailable',
    message: `No unit conversion rule from "${fromUnit}" to "${toUnit}"${item?.name ? ` for ${item.name}` : ''}`,
    fromUnit: normFrom,
    toUnit: normTo,
  };
}

export function convertQuantity(quantity, fromUnit, toUnit, options = {}) {
  const num = Number(quantity);
  if (!Number.isFinite(num)) {
    return { ok: false, error: 'invalid_quantity', message: 'Invalid numeric quantity', quantity: null };
  }
  if (num === 0) {
    return {
      ok: true,
      quantity: 0,
      factor: 1,
      fromUnit: normalizeUnit(fromUnit),
      toUnit: normalizeUnit(toUnit),
      source: 'zero',
      steps: [],
    };
  }
  const res = resolveConversionFactor(fromUnit, toUnit, options);
  if (!res.ok) return { ...res, quantity: null };
  return {
    ...res,
    quantity: roundQty(num * res.factor, options.decimals ?? 6),
  };
}

export function toStockQuantity(quantity, unit, item, rules = []) {
  const stockUnit = getItemStockUnit(item);
  const fromUnit = unit || stockUnit;
  if (!stockUnit || !fromUnit) {
    return {
      ok: true,
      quantity: roundQty(Number(quantity) || 0, 6),
      factor: 1,
      stockUnit: stockUnit || fromUnit || '',
      fromUnit: fromUnit || '',
      source: 'fallback_no_unit',
    };
  }
  const conv = convertQuantity(quantity, fromUnit, stockUnit, { item, itemId: item?.id, rules });
  return {
    ...conv,
    stockUnit,
  };
}

export function computeConvertedUnitCost(item, targetUnit, rules = []) {
  if (!item) {
    return { ok: false, unitCost: null, error: 'item_missing', reason: 'Inventory item not found' };
  }
  const rawCost = item.cost_per_unit;
  if (rawCost === null || rawCost === undefined || rawCost === '' || !Number.isFinite(Number(rawCost))) {
    return { ok: false, unitCost: null, error: 'cost_missing', reason: 'The inventory item has no cost' };
  }
  const baseCost = Number(rawCost);
  const costUnit = getItemCostUnit(item);
  const desiredUnit = targetUnit || getItemStockUnit(item) || costUnit;

  if (!costUnit) {
    return { ok: false, unitCost: null, error: 'cost_unit_missing', reason: 'The inventory item has no cost unit' };
  }

  const res = resolveConversionFactor(desiredUnit, costUnit, { item, itemId: item.id, rules });
  if (!res.ok) {
    return {
      ok: false,
      unitCost: null,
      error: res.error,
      reason: `Requested in ${desiredUnit || 'no unit'}, but the item is costed per ${costUnit} — no unit conversion rule found`,
    };
  }

  return {
    ok: true,
    unitCost: roundQty(baseCost * res.factor, 6),
    factor: res.factor,
    costUnit,
    targetUnit: normalizeUnit(desiredUnit),
    source: res.source,
    steps: res.steps,
    reason: '',
  };
}

export function computeIngredientCost(quantity, unit, item, rules = [], subRecipeFallbackCostPerOutputUnit = null) {
  const qty = Number(quantity) || 0;
  if (qty <= 0) return { ok: true, totalCost: 0, unitCost: 0, source: 'zero' };

  if (item && item.cost_per_unit != null && Number(item.cost_per_unit) > 0) {
    const uCost = computeConvertedUnitCost(item, unit || getItemStockUnit(item), rules);
    if (uCost.ok) {
      return {
        ok: true,
        totalCost: roundQty(qty * uCost.unitCost, 4),
        unitCost: uCost.unitCost,
        factor: uCost.factor,
        source: uCost.source,
      };
    }
    return {
      ok: false,
      totalCost: 0,
      unitCost: null,
      error: uCost.error,
      reason: uCost.reason,
    };
  }

  if (subRecipeFallbackCostPerOutputUnit != null && Number.isFinite(Number(subRecipeFallbackCostPerOutputUnit))) {
    const fallback = Number(subRecipeFallbackCostPerOutputUnit);
    return {
      ok: true,
      totalCost: roundQty(qty * fallback, 4),
      unitCost: fallback,
      factor: 1,
      source: 'sub_recipe',
    };
  }

  return {
    ok: false,
    totalCost: 0,
    unitCost: null,
    error: 'cost_missing',
    reason: item ? 'The inventory item has no cost' : 'Inventory item not found',
  };
}