// Centralized, system-wide Unit Conversion Engine.
// Supports built-in metric/standard units, custom global unit pairs (same dimension),
// and inventory-item-specific conversions (including cross-dimension pairs like pcs <-> g or box <-> kg).

export const DIMENSION_LABELS = {
  mass: "Weight / Mass",
  volume: "Volume / Liquid",
  count: "Count / Packaging",
  custom: "Custom Unit",
};

// Canonical unit definitions and common aliases (English + Arabic).
// Base units per dimension: mass -> 'kg', volume -> 'l', count -> 'pcs' (only pcs/piece share 1:1 by default;
// pack/box/carton are count dimension but require explicit rules to convert to pcs or weight).
export const BUILTIN_UNITS = [
  // Mass (base: kg)
  { code: "kg", label: "Kilogram (kg)", dimension: "mass", baseUnit: "kg", toBaseFactor: 1, aliases: ["kg", "kilo", "kilos", "kilogram", "kilograms", "كجم", "كيلو", "كيلوجرام"] },
  { code: "g", label: "Gram (g)", dimension: "mass", baseUnit: "kg", toBaseFactor: 0.001, aliases: ["g", "gm", "gr", "gram", "grams", "جرام", "غ", "غرام"] },
  { code: "mg", label: "Milligram (mg)", dimension: "mass", baseUnit: "kg", toBaseFactor: 0.000001, aliases: ["mg", "milligram", "milligrams", "ملجم"] },
  { code: "lb", label: "Pound (lb)", dimension: "mass", baseUnit: "kg", toBaseFactor: 0.45359237, aliases: ["lb", "lbs", "pound", "pounds", "رطل"] },
  { code: "oz", label: "Ounce (oz)", dimension: "mass", baseUnit: "kg", toBaseFactor: 0.028349523125, aliases: ["oz", "ounce", "ounces", "أوقية"] },

  // Volume (base: l)
  { code: "l", label: "Liter (l)", dimension: "volume", baseUnit: "l", toBaseFactor: 1, aliases: ["l", "lt", "ltr", "liter", "litre", "liters", "litres", "لتر"] },
  { code: "ml", label: "Milliliter (ml)", dimension: "volume", baseUnit: "l", toBaseFactor: 0.001, aliases: ["ml", "milliliter", "millilitre", "milliliters", "millilitres", "مل", "ملي"] },
  { code: "cup", label: "Cup (cup)", dimension: "volume", baseUnit: "l", toBaseFactor: 0.24, aliases: ["cup", "cups", "كوب"] },
  { code: "tbsp", label: "Tablespoon (tbsp)", dimension: "volume", baseUnit: "l", toBaseFactor: 0.015, aliases: ["tbsp", "tablespoon", "tablespoons", "ملعقة كبيرة"] },
  { code: "tsp", label: "Teaspoon (tsp)", dimension: "volume", baseUnit: "l", toBaseFactor: 0.005, aliases: ["tsp", "teaspoon", "teaspoons", "ملعقة صغيرة"] },
  { code: "gal", label: "Gallon (gal)", dimension: "volume", baseUnit: "l", toBaseFactor: 3.785411784, aliases: ["gal", "gallon", "gallons", "جالون"] },

  // Count / Discrete
  { code: "pcs", label: "Piece (pcs)", dimension: "count", baseUnit: "pcs", toBaseFactor: 1, aliases: ["pcs", "pc", "piece", "pieces", "unit", "units", "each", "قطعة", "حبة", "عدد"] },
  { code: "portion", label: "Portion / Serving", dimension: "count", baseUnit: "portion", toBaseFactor: 1, aliases: ["portion", "portions", "serving", "servings", "حصة", "بورش"] },
  { code: "pack", label: "Pack / Packet", dimension: "count", baseUnit: "pack", toBaseFactor: 1, aliases: ["pack", "packs", "packet", "packets", "باكو", "عبوة"] },
  { code: "box", label: "Box", dimension: "count", baseUnit: "box", toBaseFactor: 1, aliases: ["box", "boxes", "صندوق", "علبة"] },
  { code: "carton", label: "Carton / Case", dimension: "count", baseUnit: "carton", toBaseFactor: 1, aliases: ["carton", "cartons", "case", "cases", "كرتونة", "كرتون"] },
  { code: "bottle", label: "Bottle", dimension: "count", baseUnit: "bottle", toBaseFactor: 1, aliases: ["bottle", "bottles", "زجاجة"] },
  { code: "can", label: "Can / Tin", dimension: "count", baseUnit: "can", toBaseFactor: 1, aliases: ["can", "cans", "tin", "tins", "كانز"] },
  { code: "bag", label: "Bag / Sack", dimension: "count", baseUnit: "bag", toBaseFactor: 1, aliases: ["bag", "bags", "sack", "sacks", "كيس", "شوال"] },
  { code: "roll", label: "Roll", dimension: "count", baseUnit: "roll", toBaseFactor: 1, aliases: ["roll", "rolls", "رول", "بكرة"] },
  { code: "tray", label: "Tray", dimension: "count", baseUnit: "tray", toBaseFactor: 1, aliases: ["tray", "trays", "طبق"] },
];

// Built-in global conversion pairs exposed for display and default resolution
export const DEFAULT_GLOBAL_PAIRS = [
  { id: "builtin-kg-g", scope: "global", from_unit: "kg", to_unit: "g", factor: 1000, dimension_mode: "same_dimension", bidirectional: true, is_builtin: true, is_active: true, notes: "Standard metric mass (1 kg = 1,000 g)" },
  { id: "builtin-g-mg", scope: "global", from_unit: "g", to_unit: "mg", factor: 1000, dimension_mode: "same_dimension", bidirectional: true, is_builtin: true, is_active: true, notes: "Standard metric mass (1 g = 1,000 mg)" },
  { id: "builtin-lb-g", scope: "global", from_unit: "lb", to_unit: "g", factor: 453.59237, dimension_mode: "same_dimension", bidirectional: true, is_builtin: true, is_active: true, notes: "Imperial to metric weight (1 lb = 453.59 g)" },
  { id: "builtin-oz-g", scope: "global", from_unit: "oz", to_unit: "g", factor: 28.349523, dimension_mode: "same_dimension", bidirectional: true, is_builtin: true, is_active: true, notes: "Imperial to metric weight (1 oz = 28.35 g)" },
  { id: "builtin-l-ml", scope: "global", from_unit: "l", to_unit: "ml", factor: 1000, dimension_mode: "same_dimension", bidirectional: true, is_builtin: true, is_active: true, notes: "Standard metric volume (1 l = 1,000 ml)" },
  { id: "builtin-cup-ml", scope: "global", from_unit: "cup", to_unit: "ml", factor: 240, dimension_mode: "same_dimension", bidirectional: true, is_builtin: true, is_active: true, notes: "Standard culinary cup (1 cup = 240 ml)" },
  { id: "builtin-tbsp-ml", scope: "global", from_unit: "tbsp", to_unit: "ml", factor: 15, dimension_mode: "same_dimension", bidirectional: true, is_builtin: true, is_active: true, notes: "Standard tablespoon (1 tbsp = 15 ml)" },
  { id: "builtin-tsp-ml", scope: "global", from_unit: "tsp", to_unit: "ml", factor: 5, dimension_mode: "same_dimension", bidirectional: true, is_builtin: true, is_active: true, notes: "Standard teaspoon (1 tsp = 5 ml)" },
  { id: "builtin-gal-l", scope: "global", from_unit: "gal", to_unit: "l", factor: 3.785412, dimension_mode: "same_dimension", bidirectional: true, is_builtin: true, is_active: true, notes: "US liquid gallon (1 gal = 3.785 l)" },
];

const aliasMap = new Map();
const unitByCode = new Map();
let customCatalogRecords = [];

function rebuildUnitMaps(records = []) {
  aliasMap.clear();
  unitByCode.clear();

  for (const u of BUILTIN_UNITS) {
    const entry = {
      ...u,
      aliases: [...(u.aliases || [])],
      is_builtin: true,
      is_active: true,
    };
    unitByCode.set(u.code, entry);
    aliasMap.set(u.code.toLowerCase(), u.code);
    if (u.label) aliasMap.set(String(u.label).trim().toLowerCase(), u.code);
    for (const a of entry.aliases) {
      const clean = String(a || "").trim().toLowerCase();
      if (clean) aliasMap.set(clean, u.code);
    }
  }

  for (const rec of Array.isArray(records) ? records : []) {
    if (!rec) continue;
    const rawCanonical = String(rec.canonical_label || rec.symbol || rec.code || "").trim();
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

    const dimension = rec.dimension || existing?.dimension || "custom";
    const updated = {
      code: targetCode,
      canonical_label: rawCanonical,
      display_name: rec.display_name || existing?.label || rawCanonical,
      label: rec.display_name || existing?.label || rawCanonical,
      symbol: rec.symbol || existing?.code || targetCode,
      arabic_label: rec.arabic_label || "",
      dimension,
      baseUnit: existing?.baseUnit || targetCode,
      toBaseFactor: existing?.toBaseFactor ?? 1,
      aliases: [...mergedAliases],
      notes: rec.notes || existing?.notes || "",
      is_builtin: Boolean(existing?.is_builtin),
      is_active: rec.is_active !== false,
      record_id: rec.id || null,
    };

    unitByCode.set(targetCode, updated);
    aliasMap.set(targetCode.toLowerCase(), targetCode);
    aliasMap.set(rawCanonical.toLowerCase(), targetCode);
    if (updated.display_name) {
      aliasMap.set(String(updated.display_name).trim().toLowerCase(), targetCode);
    }
    for (const a of updated.aliases) {
      const clean = String(a || "").trim().toLowerCase();
      if (clean) aliasMap.set(clean, targetCode);
    }
  }
}

rebuildUnitMaps([]);

/**
 * Register custom/managed UnitDefinition records into the in-memory unit catalog
 * so normalizeUnit, getUnitMeta, and conversion rules use the live Unit Table.
 */
export function registerUnitCatalog(records = []) {
  customCatalogRecords = Array.isArray(records) ? records : [];
  rebuildUnitMaps(customCatalogRecords);
  return getMergedUnitCatalog(customCatalogRecords);
}

/**
 * Return the merged list of units (built-in + custom Unit Table records)
 * with canonical_label, aliases, dimension, and active status.
 */
export function getMergedUnitCatalog(records = customCatalogRecords) {
  rebuildUnitMaps(records);
  return Array.from(unitByCode.values()).map((u) => ({
    ...u,
    canonical_label: u.canonical_label || u.code,
    display_name: u.display_name || u.label || u.code,
    symbol: u.symbol || u.code,
    aliases: Array.from(new Set((u.aliases || []).map((a) => String(a).trim()).filter(Boolean))),
    is_active: u.is_active !== false,
  }));
}

/**
 * Validate a unit record for the Unit Table (canonical_label is the only required field).
 * Prevents case-insensitive duplicate canonical labels or conflicting aliases across units.
 */
export function validateUnitDefinition(candidate, existingRecords = []) {
  const canonicalLabel = String(candidate?.canonical_label || "").trim();
  if (!canonicalLabel) {
    return { valid: false, error: "Canonical unit label is required." };
  }

  const symbol = String(candidate?.symbol || "").trim();
  const canonicalCode = (symbol || canonicalLabel).toLowerCase();
  const displayName = String(candidate?.display_name || "").trim();
  const arabicLabel = String(candidate?.arabic_label || "").trim();
  const dimension = ["mass", "volume", "count", "custom"].includes(candidate?.dimension)
    ? candidate.dimension
    : getUnitDimension(canonicalCode) || "custom";

  const rawAliases = Array.isArray(candidate?.aliases)
    ? candidate.aliases
    : String(candidate?.aliases || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  const normalizedAliases = [];
  const seenAliases = new Set();
  for (const item of [canonicalLabel, symbol, arabicLabel, ...rawAliases]) {
    const trimmed = String(item || "").trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seenAliases.has(lower)) {
      seenAliases.add(lower);
      normalizedAliases.push(trimmed);
    }
  }

  // Build other units from built-in + existing DB records (excluding the record being edited)
  const otherDbRecords = (Array.isArray(existingRecords) ? existingRecords : []).filter(
    (r) => r && r.id !== candidate?.id
  );
  const editingBuiltinCode = candidate?.builtin_code ? String(candidate.builtin_code).toLowerCase() : null;

  const ownerByToken = new Map();
  for (const b of BUILTIN_UNITS) {
    if (editingBuiltinCode && b.code.toLowerCase() === editingBuiltinCode) continue;
    // If an existing DB record already overrides this built-in, let the DB record represent it
    const overriddenByEditing =
      candidate?.id &&
      existingRecords.some(
        (r) =>
          r.id === candidate.id &&
          (String(r.symbol || r.canonical_label || "").trim().toLowerCase() === b.code.toLowerCase())
      );
    if (overriddenByEditing) continue;
    if (b.code.toLowerCase() === canonicalCode && candidate?.is_builtin_override) continue;

    ownerByToken.set(b.code.toLowerCase(), b.code);
    for (const a of b.aliases || []) {
      ownerByToken.set(String(a).trim().toLowerCase(), b.code);
    }
  }

  for (const r of otherDbRecords) {
    const rCode = String(r.symbol || r.canonical_label || "").trim().toLowerCase();
    if (!rCode) continue;
    ownerByToken.set(rCode, r.canonical_label || rCode);
    ownerByToken.set(String(r.canonical_label || "").trim().toLowerCase(), r.canonical_label || rCode);
    for (const a of r.aliases || []) {
      const clean = String(a || "").trim().toLowerCase();
      if (clean) ownerByToken.set(clean, r.canonical_label || rCode);
    }
  }

  // Check if canonical label or symbol conflicts with another unit
  const canonicalConflict = ownerByToken.get(canonicalLabel.toLowerCase());
  if (canonicalConflict && canonicalConflict.toLowerCase() !== canonicalCode) {
    return {
      valid: false,
      error: `"${canonicalLabel}" is already registered under canonical unit "${canonicalConflict}". Edit "${canonicalConflict}" to manage its aliases instead of creating a duplicate unit.`,
    };
  }

  if (symbol) {
    const symbolConflict = ownerByToken.get(symbol.toLowerCase());
    if (symbolConflict && symbolConflict.toLowerCase() !== canonicalCode) {
      return {
        valid: false,
        error: `Symbol "${symbol}" is already used by unit "${symbolConflict}".`,
      };
    }
  }

  for (const alias of normalizedAliases) {
    const conflictOwner = ownerByToken.get(alias.toLowerCase());
    if (conflictOwner && conflictOwner.toLowerCase() !== canonicalCode && conflictOwner.toLowerCase() !== canonicalLabel.toLowerCase()) {
      return {
        valid: false,
        error: `Alias "${alias}" is already mapped to canonical unit "${conflictOwner}". Remove it here or update "${conflictOwner}".`,
      };
    }
  }

  return {
    valid: true,
    normalized: {
      canonical_label: canonicalLabel,
      symbol: symbol || canonicalLabel,
      display_name: displayName || "",
      arabic_label: arabicLabel || "",
      dimension,
      aliases: normalizedAliases,
      notes: String(candidate?.notes || "").trim(),
      is_active: candidate?.is_active !== false,
    },
  };
}

export function roundQty(n, decimals = 6) {
  const num = Number(n);
  if (!Number.isFinite(num)) return 0;
  const f = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * f) / f;
}

/** Normalize any unit label or alias to its canonical unit code (e.g. "grams" -> "g", "piece" -> "pcs"). */
export function normalizeUnit(raw) {
  const cleaned = String(raw || "").trim().toLowerCase();
  if (!cleaned) return "";
  return aliasMap.get(cleaned) || cleaned;
}

/** Get metadata for a unit code or label. */
export function getUnitMeta(raw) {
  const code = normalizeUnit(raw);
  if (!code) return null;
  return unitByCode.get(code) || {
    code,
    label: String(raw || code).trim(),
    dimension: "custom",
    baseUnit: code,
    toBaseFactor: 1,
    aliases: [code],
  };
}

/** Determine the dimension of a unit ('mass' | 'volume' | 'count' | 'custom'). */
export function getUnitDimension(raw) {
  return getUnitMeta(raw)?.dimension || "custom";
}

/** Check if two units share a compatible physical dimension for global rules. */
export function areDimensionsCompatible(unitA, unitB) {
  const dimA = getUnitDimension(unitA);
  const dimB = getUnitDimension(unitB);
  if (dimA === "custom" || dimB === "custom") return true;
  return dimA === dimB;
}

/** Canonical stock unit for an InventoryItem record. */
export function getItemStockUnit(item) {
  if (!item) return "";
  const explicit = String(item.selling_unit_label || item.unit || "").trim();
  if (explicit) return explicit;
  return item.selling_unit === "weight" ? "kg" : "pcs";
}

/** Canonical cost/purchase unit for an InventoryItem record. */
export function getItemCostUnit(item) {
  if (!item) return "";
  const explicit = String(item.purchase_unit_label || item.unit || item.selling_unit_label || "").trim();
  if (explicit) return explicit;
  return item.purchase_unit === "weight" ? "kg" : "pcs";
}

/**
 * Build adjacency list for conversion resolution.
 * Precedence:
 *  Tier 1: Item-specific rules for `targetItemId` (can be same-dimension or cross-dimension)
 *  Tier 2: Custom global rules from DB (same-dimension or custom units)
 *  Tier 3: Built-in standard metric/volume conversions
 */
function buildEdges(rules = [], targetItemId = null) {
  const activeRules = (Array.isArray(rules) ? rules : []).filter((r) => r && r.is_active !== false);
  const itemEdges = [];
  const globalCustomEdges = [];
  const builtinEdges = [];

  if (targetItemId) {
    for (const r of activeRules) {
      if (r.scope === "item" && String(r.inventory_item_id || "") === String(targetItemId)) {
        const from = normalizeUnit(r.from_unit);
        const to = normalizeUnit(r.to_unit);
        const factor = Number(r.factor);
        if (!from || !to || from === to || !(factor > 0)) continue;
        itemEdges.push({ from, to, factor, source: "item_rule", ruleId: r.id || null, label: `${r.inventory_item_name || "Item"}: 1 ${from} = ${factor} ${to}` });
        if (r.bidirectional !== false) {
          itemEdges.push({ from: to, to: from, factor: 1 / factor, source: "item_rule_inverse", ruleId: r.id || null, label: `${r.inventory_item_name || "Item"}: 1 ${to} = ${roundQty(1 / factor, 6)} ${from}` });
        }
      }
    }
  }

  for (const r of activeRules) {
    if (r.scope === "global" && !r.is_builtin) {
      const from = normalizeUnit(r.from_unit);
      const to = normalizeUnit(r.to_unit);
      const factor = Number(r.factor);
      if (!from || !to || from === to || !(factor > 0)) continue;
      // Global rules cannot cross incompatible physical dimensions (e.g. mass <-> count)
      if (!areDimensionsCompatible(from, to)) continue;
      globalCustomEdges.push({ from, to, factor, source: "global_rule", ruleId: r.id || null, label: `Global: 1 ${from} = ${factor} ${to}` });
      if (r.bidirectional !== false) {
        globalCustomEdges.push({ from: to, to: from, factor: 1 / factor, source: "global_rule_inverse", ruleId: r.id || null, label: `Global: 1 ${to} = ${roundQty(1 / factor, 6)} ${from}` });
      }
    }
  }

  for (const r of DEFAULT_GLOBAL_PAIRS) {
    const from = normalizeUnit(r.from_unit);
    const to = normalizeUnit(r.to_unit);
    const factor = Number(r.factor);
    builtinEdges.push({ from, to, factor, source: "builtin", ruleId: r.id, label: `Built-in: 1 ${from} = ${factor} ${to}` });
    if (r.bidirectional !== false) {
      builtinEdges.push({ from: to, to: from, factor: 1 / factor, source: "builtin_inverse", ruleId: r.id, label: `Built-in: 1 ${to} = ${roundQty(1 / factor, 6)} ${from}` });
    }
  }

  return { itemEdges, globalCustomEdges, builtinEdges };
}

/**
 * Resolve conversion factor from `fromUnit` to `toUnit`.
 * Returns:
 *  { ok: true, factor, fromUnit: normFrom, toUnit: normTo, source, steps }
 *  or
 *  { ok: false, error: code, message, fromUnit: normFrom, toUnit: normTo }
 */
export function resolveConversionFactor(fromUnit, toUnit, options = {}) {
  const normFrom = normalizeUnit(fromUnit);
  const normTo = normalizeUnit(toUnit);
  const item = options.item || null;
  const targetItemId = options.itemId || item?.id || null;
  const rules = options.rules || [];

  if (!normFrom || !normTo) {
    return {
      ok: false,
      error: "unit_missing",
      message: `Missing unit (${fromUnit || "none"} → ${toUnit || "none"})`,
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
      source: "same_unit",
      steps: [],
    };
  }

  const { itemEdges, globalCustomEdges, builtinEdges } = buildEdges(rules, targetItemId);

  // 1. Direct item-specific match wins immediately
  const directItem = itemEdges.filter((e) => e.from === normFrom && e.to === normTo);
  if (directItem.length > 0) {
    // Check for conflicting direct item rules
    const firstFactor = directItem[0].factor;
    const conflict = directItem.some((e) => Math.abs(e.factor - firstFactor) / firstFactor > 1e-6);
    if (conflict) {
      return {
        ok: false,
        error: "ambiguous_conversion",
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
      source: "item_rule",
      steps: [directItem[0].label],
    };
  }

  // 2. Direct custom global match (only when dimensions are compatible)
  const directGlobal = globalCustomEdges.filter((e) => e.from === normFrom && e.to === normTo);
  if (directGlobal.length > 0) {
    const firstFactor = directGlobal[0].factor;
    const conflict = directGlobal.some((e) => Math.abs(e.factor - firstFactor) / firstFactor > 1e-6);
    if (conflict) {
      return {
        ok: false,
        error: "ambiguous_conversion",
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
      source: "global_rule",
      steps: [directGlobal[0].label],
    };
  }

  // 3. Direct built-in metric/volume match
  const metaFrom = unitByCode.get(normFrom);
  const metaTo = unitByCode.get(normTo);
  if (metaFrom && metaTo && metaFrom.baseUnit === metaTo.baseUnit && metaFrom.toBaseFactor > 0 && metaTo.toBaseFactor > 0) {
    // Check if a custom global rule overrode one of the legs; if not, use exact base ratio
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
        source: "builtin",
        steps: [`Built-in metric (${normFrom} → ${normTo})`],
      };
    }
  }

  // 4. Multi-hop BFS across itemEdges -> globalCustomEdges -> builtinEdges
  // Ordered so item edges take priority over global custom edges, which take priority over built-in edges.
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
          nextSources.has("item_rule") || nextSources.has("item_rule_inverse")
            ? "item_rule"
            : nextSources.has("global_rule") || nextSources.has("global_rule_inverse")
            ? "global_rule"
            : "builtin";
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

  const dimFrom = getUnitDimension(normFrom);
  const dimTo = getUnitDimension(normTo);
  const crossDimHint =
    dimFrom !== dimTo
      ? ` (${normFrom} is ${dimFrom} and ${normTo} is ${dimTo} — add an item-specific conversion rule in Admin → Unit Conversions)`
      : ` (add a conversion rule between ${normFrom} and ${normTo} in Admin → Unit Conversions)`;

  return {
    ok: false,
    error: "unit_conversion_unavailable",
    message: `No conversion rule from "${fromUnit}" to "${toUnit}"${item?.name ? ` for ${item.name}` : ""}${crossDimHint}`,
    fromUnit: normFrom,
    toUnit: normTo,
  };
}

/**
 * Convert a numeric quantity from `fromUnit` to `toUnit`.
 */
export function convertQuantity(quantity, fromUnit, toUnit, options = {}) {
  const num = Number(quantity);
  if (!Number.isFinite(num)) {
    return { ok: false, error: "invalid_quantity", message: "Invalid numeric quantity", quantity: null };
  }
  if (num === 0) {
    return {
      ok: true,
      quantity: 0,
      factor: 1,
      fromUnit: normalizeUnit(fromUnit),
      toUnit: normalizeUnit(toUnit),
      source: "zero",
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

/**
 * Convert an ingredient or line quantity into the InventoryItem's stock unit (`selling_unit_label || unit`).
 */
export function toStockQuantity(quantity, unit, item, rules = []) {
  const stockUnit = getItemStockUnit(item);
  const fromUnit = unit || stockUnit;
  if (!stockUnit || !fromUnit) {
    return {
      ok: true,
      quantity: roundQty(Number(quantity) || 0, 6),
      factor: 1,
      stockUnit: stockUnit || fromUnit || "",
      fromUnit: fromUnit || "",
      source: "fallback_no_unit",
    };
  }
  const conv = convertQuantity(quantity, fromUnit, stockUnit, { item, itemId: item?.id, rules });
  return {
    ...conv,
    stockUnit,
  };
}

/**
 * Convert a required shortfall (in its recipe/reservation unit, e.g. g or ml)
 * into the supplier's purchase unit (e.g. kg or L) using the established
 * Unit Conversion Table & rules (item-specific > custom global > built-in metric).
 */
export function convertCartShortfallToBuyQuantity(shortfall, fromUnit, item, unitRules = []) {
  const numericShortfall = Number(shortfall) || 0;
  const reqUnit = String(fromUnit || getItemStockUnit(item) || "").trim();
  const buyUnit = String(item?.purchase_unit_label || getItemCostUnit(item) || reqUnit).trim();

  if (numericShortfall <= 0) {
    return {
      ok: true,
      quantity: 0,
      fromUnit: reqUnit,
      buyUnit: buyUnit || reqUnit,
      factor: 1,
      converted: false,
    };
  }

  if (!reqUnit || !buyUnit || normalizeUnit(reqUnit) === normalizeUnit(buyUnit)) {
    return {
      ok: true,
      quantity: roundQty(numericShortfall, 4),
      fromUnit: reqUnit,
      buyUnit: buyUnit || reqUnit,
      factor: 1,
      converted: false,
    };
  }

  const conv = convertQuantity(numericShortfall, reqUnit, buyUnit, {
    item,
    itemId: item?.id,
    rules: unitRules,
    decimals: 4,
  });

  if (conv.ok) {
    return {
      ok: true,
      quantity: roundQty(conv.quantity, 4),
      fromUnit: reqUnit,
      buyUnit,
      factor: conv.factor,
      converted: true,
      source: conv.source,
      steps: conv.steps,
    };
  }

  return {
    ok: false,
    quantity: roundQty(numericShortfall, 4),
    fromUnit: reqUnit,
    buyUnit,
    factor: 1,
    converted: false,
    error: conv.error,
    message: conv.message,
  };
}

/**
 * Compute the unit cost for 1 `targetUnit` of `item`, given `item.cost_per_unit` is expressed per `getItemCostUnit(item)`.
 * Example:
 *  - Item cost_per_unit = 200 EGP per 'kg' (costUnit = 'kg')
 *  - targetUnit = 'g'
 *  - 1 g = 0.001 kg -> unitCostInTarget = 200 * 0.001 = 0.20 EGP per g
 */
export function computeConvertedUnitCost(item, targetUnit, rules = []) {
  if (!item) {
    return { ok: false, unitCost: null, error: "item_missing", reason: "Inventory item not found" };
  }
  const rawCost = item.cost_per_unit;
  if (rawCost === null || rawCost === undefined || rawCost === "" || !Number.isFinite(Number(rawCost))) {
    return { ok: false, unitCost: null, error: "cost_missing", reason: "The inventory item has no cost" };
  }
  const baseCost = Number(rawCost);
  const costUnit = getItemCostUnit(item);
  const desiredUnit = targetUnit || getItemStockUnit(item) || costUnit;

  if (!costUnit) {
    return { ok: false, unitCost: null, error: "cost_unit_missing", reason: "The inventory item has no cost unit" };
  }

  const res = resolveConversionFactor(desiredUnit, costUnit, { item, itemId: item.id, rules });
  if (!res.ok) {
    return {
      ok: false,
      unitCost: null,
      error: res.error,
      reason: `Requested in ${desiredUnit || "no unit"}, but the item is costed per ${costUnit} — no unit conversion rule found`,
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
    reason: "",
  };
}

/**
 * Compute the total cost for `quantity` in `unit` of `item`.
 */
export function computeIngredientCost(quantity, unit, item, rules = [], subRecipeFallbackCostPerOutputUnit = null) {
  const qty = Number(quantity) || 0;
  if (qty <= 0) return { ok: true, totalCost: 0, unitCost: 0, source: "zero" };

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
      source: "sub_recipe",
    };
  }

  return {
    ok: false,
    totalCost: 0,
    unitCost: null,
    error: "cost_missing",
    reason: item ? "The inventory item has no cost" : "Inventory item not found",
  };
}

/**
 * Validate a candidate rule before saving to prevent invalid factors, global cross-dimension rules,
 * or contradictory duplicate/cyclic rules.
 */
export function validateConversionRule(candidate, existingRules = []) {
  const scope = candidate.scope === "item" ? "item" : "global";
  const from = normalizeUnit(candidate.from_unit);
  const to = normalizeUnit(candidate.to_unit);
  const factor = Number(candidate.factor);

  if (!from || !to) {
    return { valid: false, error: "Both source unit and target unit are required." };
  }
  if (from === to) {
    return { valid: false, error: `Source unit (${from}) and target unit (${to}) resolve to the same canonical unit.` };
  }
  if (!Number.isFinite(factor) || factor <= 0) {
    return { valid: false, error: "Conversion factor must be a positive number greater than 0." };
  }
  if (scope === "item" && !candidate.inventory_item_id) {
    return { valid: false, error: "Please select an inventory item for an item-specific conversion rule." };
  }
  if (scope === "global" && !areDimensionsCompatible(from, to)) {
    const dimFrom = DIMENSION_LABELS[getUnitDimension(from)] || getUnitDimension(from);
    const dimTo = DIMENSION_LABELS[getUnitDimension(to)] || getUnitDimension(to);
    return {
      valid: false,
      error: `Global rules must connect compatible dimensions (${from} is ${dimFrom}, ${to} is ${dimTo}). Use an Item-Specific rule for cross-dimension conversions like ${from} ↔ ${to}.`,
    };
  }

  // Check for existing duplicate or cycle contradiction in the same scope
  const otherRules = existingRules.filter((r) => r && r.id !== candidate.id && r.is_active !== false);
  const sameScopeDuplicate = otherRules.find((r) => {
    if ((r.scope || "global") !== scope) return false;
    if (scope === "item" && String(r.inventory_item_id || "") !== String(candidate.inventory_item_id || "")) return false;
    const rFrom = normalizeUnit(r.from_unit);
    const rTo = normalizeUnit(r.to_unit);
    return (rFrom === from && rTo === to) || (r.bidirectional !== false && rFrom === to && rTo === from);
  });

  if (sameScopeDuplicate) {
    return {
      valid: false,
      error: `A ${scope === "item" ? "rule for this item" : "global rule"} between "${from}" and "${to}" already exists. Edit the existing rule instead.`,
    };
  }

  // Check if a multi-hop path already exists in the same scope with a contradicting factor
  const existingPath = resolveConversionFactor(from, to, {
    itemId: scope === "item" ? candidate.inventory_item_id : null,
    rules: otherRules,
  });
  if (existingPath.ok && existingPath.source !== "builtin") {
    // Only block if it's in the same tier (e.g. an item rule contradicting another chained item rule, or global contradicting global)
    const sameTier =
      (scope === "item" && existingPath.source === "item_rule") ||
      (scope === "global" && existingPath.source === "global_rule");
    if (sameTier && Math.abs(existingPath.factor - factor) / existingPath.factor > 1e-4) {
      return {
        valid: false,
        error: `Cycle conflict: existing rules already imply 1 ${from} = ${roundQty(existingPath.factor, 4)} ${to} (${existingPath.steps.join(" → ")}).`,
      };
    }
  }

  return {
    valid: true,
    normalized: {
      ...candidate,
      scope,
      from_unit: from,
      to_unit: to,
      factor: roundQty(factor, 6),
      dimension_mode: areDimensionsCompatible(from, to) ? "same_dimension" : "cross_dimension",
      bidirectional: candidate.bidirectional !== false,
      is_active: candidate.is_active !== false,
    },
  };
}