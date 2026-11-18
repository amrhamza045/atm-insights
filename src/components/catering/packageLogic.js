import { round2 } from "./cateringLogic";

/**
 * Expand a package template into quote line items for a given guest count.
 * per_guest lines scale with guests; fixed lines are used as-is.
 * When the package carries a headline price (per_guest / flat), item prices are
 * zeroed and a single package charge line carries the selling price — costs
 * still come from the items so margin stays accurate.
 */
export function expandPackageLines(pkg, guests, { itemizeHeadline = false } = {}) {
  const g = Math.max(0, Number(guests) || 0);
  const headline =
    pkg?.pricing_mode === "per_guest"
      ? round2((Number(pkg.base_price_per_guest) || 0) * g)
      : pkg?.pricing_mode === "flat"
      ? round2(Number(pkg.flat_price) || 0)
      : 0;
  const useHeadline = headline > 0;

  // Optionally show the headline price per line instead of one package charge:
  // each item's own price is scaled by the same factor so the lines add up to
  // exactly the headline amount (last line absorbs the rounding remainder).
  const raw = (pkg?.line_items || []).map((li) => {
    const qty = li.scaling === "fixed" ? Number(li.quantity) || 0 : round2((Number(li.quantity) || 0) * g);
    return { li, qty, base: qty * (Number(li.unit_price) || 0) };
  });
  const spread = useHeadline && itemizeHeadline && raw.reduce((s, r) => s + r.base, 0) > 0;
  if (spread) {
    const basis = raw.reduce((s, r) => s + r.base, 0);
    let allocated = 0;
    return raw.map((r, i) => {
      const amount = i === raw.length - 1 ? round2(headline - allocated) : round2((r.base / basis) * headline);
      allocated = round2(allocated + amount);
      return {
        item_type: r.li.item_type || "custom",
        cost_category: r.li.cost_category || "food",
        menu_item_id: r.li.menu_item_id || "",
        name: r.li.name || "",
        description: r.li.description || "",
        quantity: r.qty,
        unit_price: r.qty > 0 ? round2(amount / r.qty) : 0,
        unit_cost: Number(r.li.unit_cost) || 0,
        reference_unit_price: 0,
        tax_exempt: !!r.li.tax_exempt,
        service_exempt: !!r.li.service_exempt,
      };
    });
  }

  const lines = (pkg?.line_items || []).map((li) => {
    const qty = li.scaling === "fixed" ? Number(li.quantity) || 0 : round2((Number(li.quantity) || 0) * g);
    return {
      item_type: li.item_type || "custom",
      cost_category: li.cost_category || "food",
      menu_item_id: li.menu_item_id || "",
      name: li.name || "",
      description: li.description || "",
      quantity: qty,
      unit_price: useHeadline ? 0 : Number(li.unit_price) || 0,
      // Headline-priced packages zero the billed unit price (the package charge line
      // carries it), but staff still need to see what the item is worth on its own.
      // Reference only — never used in any total.
      reference_unit_price: useHeadline ? Number(li.unit_price) || 0 : 0,
      unit_cost: Number(li.unit_cost) || 0,
      tax_exempt: !!li.tax_exempt,
      service_exempt: !!li.service_exempt,
    };
  });

  if (useHeadline) {
    lines.push({
      item_type: "custom",
      menu_item_id: "",
      name: `${pkg.name} — package charge${pkg.pricing_mode === "per_guest" ? ` (${g} guests)` : ""}`,
      description: "",
      quantity: 1,
      unit_price: headline,
      unit_cost: 0,
      tax_exempt: false,
      service_exempt: false,
    });
  }

  return lines;
}

/** Cost / price / profit / margin % for a set of lines — shown before a quote is sent. */
export function lineEconomics(lines = []) {
  let price = 0;
  let cost = 0;
  lines.forEach((l) => {
    const qty = Number(l.quantity) || 0;
    price += qty * (Number(l.unit_price) || 0);
    cost += qty * (Number(l.unit_cost) || 0);
  });
  const profit = price - cost;
  return {
    price: round2(price),
    cost: round2(cost),
    profit: round2(profit),
    margin_pct: price > 0 ? round2((profit / price) * 100) : 0,
  };
}

export function packageEconomics(pkg, guests) {
  return lineEconomics(expandPackageLines(pkg, guests));
}