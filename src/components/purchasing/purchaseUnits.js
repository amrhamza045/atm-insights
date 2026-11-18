import { getItemCostUnit, getItemStockUnit, getUnitMeta, normalizeUnit, resolveConversionFactor, roundQty } from '@/lib/unitConversion';

export function purchaseUnitType(unit) {
  return ['mass', 'volume'].includes(getUnitMeta(unit).dimension) ? 'weight' : 'pcs';
}

export function purchaseUnitOptions(item, catalog, rules = []) {
  const buy = normalizeUnit(getItemCostUnit(item));
  const stock = normalizeUnit(getItemStockUnit(item));
  const candidates = new Map(catalog.map(u => [normalizeUnit(u.code), u]));
  for (const code of [buy, stock]) if (code && !candidates.has(code)) candidates.set(code, { code, label: code });
  return [...candidates.values()].filter(u => {
    const options = { item, rules };
    return resolveConversionFactor(u.code, buy, options).ok && resolveConversionFactor(u.code, stock, options).ok;
  }).sort((a, b) => (a.code === buy ? -1 : b.code === buy ? 1 : a.code.localeCompare(b.code)));
}

export function purchaseUnitPrice(item, unit, invoices = [], rules = []) {
  const prices = [];
  for (const invoice of invoices) for (const line of invoice.items || []) {
    if (line.inventory_item_id !== item.id) continue;
    // Legacy invoices without a unit label cannot safely price a different unit.
    const source = line.unit || line.purchase_unit_label;
    const price = Number(line.purchase_price ?? line.unit_price);
    if (!source || !Number.isFinite(price) || price <= 0) continue;
    const conversion = resolveConversionFactor(unit, source, { item, rules });
    if (conversion.ok) prices.push(price * conversion.factor);
  }
  if (prices.length) return roundQty(prices.reduce((a, b) => a + b, 0) / prices.length);
  const conversion = resolveConversionFactor(unit, getItemCostUnit(item), { item, rules });
  return conversion.ok ? roundQty((Number(item.cost_per_unit) || 0) * conversion.factor) : 0;
}

export function changePurchaseUnit(line, nextUnit, item, rules = [], quantityKey = 'quantity') {
  const previous = line.purchase_unit_label || line.unit;
  const conversion = resolveConversionFactor(previous, nextUnit, { item, rules });
  const stock = resolveConversionFactor(nextUnit, getItemStockUnit(item), { item, rules });
  if (!conversion.ok || !stock.ok) throw new Error(conversion.message || stock.message);
  const factor = conversion.factor;
  const quantity = roundQty((Number(line[quantityKey]) || 0) * factor);
  const price = roundQty((Number(line.unit_price) || 0) / factor);
  return { ...line, [quantityKey]: quantity, purchase_unit: purchaseUnitType(nextUnit),
    purchase_unit_label: normalizeUnit(nextUnit), unit_price: price,
    base_unit_price: roundQty(Number(line.base_unit_price ?? line.unit_price ?? 0) / factor),
    manual_unit_price: line.manual_unit_price === '' || line.manual_unit_price == null ? '' : price,
    total_price: roundQty(quantity * price), conversion_warning: '',
    ...(quantityKey === 'quantity_ordered' ? { unit: normalizeUnit(nextUnit) } : {}) };
}