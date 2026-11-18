import { numberOrNull, businessDay } from './cateringActualCostCommon.js';
import { normalizeUnit as normCanonical, resolveConversionFactor, getUnitDimension } from './unitConversion.js';

export const normalizeUnit = (unit) => normCanonical(unit);

export function invoiceRate(line, targetUnit, rules = []) {
  const source = normalizeUnit(line.unit), target = normalizeUnit(targetUnit);
  if (!source || !target) return { error: 'unit_missing' };
  const qty = numberOrNull(line.quantity), price = numberOrNull(line.purchase_price);
  const base = numberOrNull(line.total_cost) ?? (qty !== null && price !== null ? qty * price : null);
  // Landed cost: the line's share of invoice freight is part of what the stock cost.
  const total = base === null ? null : base + (Number(line.allocated_freight) || 0);
  if (!(qty > 0) || !(total >= 0)) return { error: 'invalid_invoice_cost' };

  const hasItemRule = (rules || []).some(
    (r) => r && r.scope === 'item' && String(r.inventory_item_id || '') === String(line.inventory_item_id || '')
  );
  if (line.unit_type === 'pcs' && getUnitDimension(source) === 'mass' && !hasItemRule) {
    return { error: 'invoice_unit_conflict' };
  }

  let denominator;
  let conversion;
  if (source === target) {
    denominator = qty;
    conversion = 'same_explicit_unit';
  } else {
    const conv = resolveConversionFactor(source, target, {
      itemId: line.inventory_item_id,
      rules,
    });
    if (conv.ok) {
      denominator = qty * conv.factor;
      conversion = conv.source === 'item_rule' ? 'item_unit_conversion' : conv.source === 'global_rule' ? 'global_unit_conversion' : 'metric_unit_conversion';
    } else if (getUnitDimension(target) === 'count' && numberOrNull(line.pieces_count) > 0) {
      denominator = Number(line.pieces_count);
      conversion = 'recorded_pieces_count';
    } else {
      return { error: 'unit_conversion_unavailable' };
    }
  }
  return { unit_cost: total / denominator, conversion, invoice_total_cost: total, invoice_quantity: qty, normalized_quantity: denominator };
}

export function purchaseRate(invoices, itemId, unit, asOf, rules = []) {
  const day = businessDay(asOf);
  if (!day || !itemId) return { error: !day ? 'valuation_date_missing' : 'inventory_link_missing' };
  const matches = invoices.filter(i => businessDay(i.invoice_date) && businessDay(i.invoice_date) <= day && (i.items || []).some(l => l.inventory_item_id === itemId));
  matches.sort((a, b) => String(b.invoice_date).localeCompare(String(a.invoice_date)) || String(b.created_date).localeCompare(String(a.created_date)) || b.id.localeCompare(a.id));
  const invoice = matches[0];
  if (!invoice) return { error: 'purchase_history_missing', as_of_date: day };
  const lines = (invoice.items || []).map((line, index) => ({ line, index })).filter(x => x.line.inventory_item_id === itemId);
  const rated = lines.map(x => ({ ...x, rate: invoiceRate(x.line, unit, rules) }));
  const bad = rated.find(x => x.rate.error);
  const source = { invoice_id: invoice.id, invoice_number: invoice.invoice_number, invoice_date: invoice.invoice_date, invoice_updated_date: invoice.updated_date, as_of_date: day, target_unit: unit, invoice_lines: rated };
  if (bad) return { ...source, error: bad.rate.error };
  const total = rated.reduce((s, x) => s + x.rate.invoice_total_cost, 0);
  const quantity = rated.reduce((s, x) => s + x.rate.normalized_quantity, 0);
  return { ...source, unit_cost: total / quantity, method: 'latest_invoice_weighted_same_item_lines' };
}