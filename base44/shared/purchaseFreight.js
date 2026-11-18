import { requireValue } from './financeValidation.js';

// B08 landed cost: invoice freight is capitalized into stock, split across the lines
// in proportion to line value (2-decimal currency units). Freight is billed on the
// same supplier invoice, so it is part of the invoice total and the supplier balance.
const cents = (v) => Math.round((Number(v) || 0) * 100);
export const lineFreight = (line) => Number(line?.allocated_freight) || 0;
export const invoiceFreight = (invoice) => Number(invoice?.freight_amount) || 0;
export const landedLineCost = (line) => (cents(line.total_cost) + cents(lineFreight(line))) / 100;
// Purchase price plus this line's freight per purchased unit.
export function landedUnitPrice(line) {
  const qty = Number(line.quantity) || 0, price = Number(line.purchase_price) || 0;
  return qty > 0 && lineFreight(line) ? Math.round((price + lineFreight(line) / qty) * 10000) / 10000 : price;
}

export function allocateFreight(items, freight) {
  const raw = Number(freight || 0);
  requireValue(Number.isFinite(raw) && raw >= 0, 'Freight must be zero or a positive amount.');
  const total = cents(raw), base = items.map((l) => Math.max(0, cents(l.total_cost))), sum = base.reduce((a, b) => a + b, 0);
  requireValue(!total || sum > 0, 'Freight needs at least one priced line to absorb it.');
  const shares = base.map((b) => (total ? Math.floor((total * b) / sum) : 0));
  const order = base.map((_, i) => i).filter((i) => base[i] > 0).sort((a, b) => base[b] - base[a]);
  for (let rest = total - shares.reduce((a, b) => a + b, 0), k = 0; rest > 0; rest--, k++) shares[order[k % order.length]] += 1;
  return { freight_amount: total / 100, items: items.map((l, i) => ({ ...l, allocated_freight: shares[i] / 100 })) };
}

// Posted invoices must carry allocations that add up to the invoice freight.
export function checkFreight(invoice) {
  const split = (invoice.items || []).reduce((s, l) => s + cents(lineFreight(l)), 0);
  requireValue(split === cents(invoiceFreight(invoice)), 'Invoice freight does not reconcile with its line allocations.');
  return split;
}