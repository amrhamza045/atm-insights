// Same method as Purchases › Average Prices: the plain mean of the purchase price on every
// non-draft invoice line for the item, taken in the unit type the item is bought in.
// A piece-bought item that only ever arrived by weight uses the lines' price per piece.
// Returns null when there is no purchase basis, so callers keep the entered cost.
const round4 = (n) => Math.round(n * 10000) / 10000;
const mean = (xs) => (xs.length ? round4(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export function averagePurchaseCost(item, invoices, priceInCostUnit = (line) => Number(line.purchase_price) || 0) {
  const type = item.purchase_unit === 'weight' ? 'weight' : 'pcs';
  const lines = (invoices || [])
    .filter((inv) => inv.status !== 'draft')
    .flatMap((inv) => inv.items || [])
    .filter((l) => l.inventory_item_id === item.id);
  const same = lines.filter((l) => (l.unit_type || 'pcs') === type).map(priceInCostUnit).filter(Number.isFinite);
  let avg = mean(same);
  if (avg == null && type === 'pcs') {
    avg = mean(lines.filter((l) => l.unit_type === 'weight' && Number(l.price_per_pcs) > 0).map((l) => Number(l.price_per_pcs)));
  }
  return avg > 0 ? avg : null;
}

export const costOrEntered = (avg, item) => avg ?? (Number(item.cost_per_unit) || 0);