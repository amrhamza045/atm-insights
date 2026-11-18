import { purchaseRate, normalizeUnit } from './cateringPurchaseRates.js';
import { numberOrNull, roundMoney, sumAmounts, flag } from './cateringActualCostCommon.js';
import { resolveConversionFactor } from './unitConversion.js';

export function actualFood({ event, slips, waste, returns, invoices, unitRules = [] }, warnings) {
  const rows = [], seenReservations = new Set();
  const fulfilled = slips.filter(s => s.status === 'fulfilled');
  if (!fulfilled.length) flag(warnings, 'food_no_fulfilled_release_slips', event.id);
  if (!slips.length && !waste.length && !returns.length) flag(warnings, 'food_no_source_records', event.id);
  const valued = (row, qty, rate) => {
    row.valuation = rate;
    if (qty === null || qty < 0) { flag(warnings, 'invalid_food_quantity', row.source_id); row.excluded = 'invalid_food_quantity'; }
    else if (qty === 0) row.amount = 0;
    else if (rate.error) { flag(warnings, rate.error, row.source_id, row.item_name || ''); row.excluded = rate.error; }
    else row.amount = roundMoney(qty * rate.unit_cost * row.sign);
    rows.push(row);
  };
  for (const slip of slips) {
    if (slip.status !== 'fulfilled') {
      rows.push({ source_type: 'KitchenReleaseSlip', source_id: slip.id, status: slip.status, amount: 0, excluded: 'not_fulfilled' });
      if (slip.status === 'open') flag(warnings, 'food_release_still_open', slip.id);
      continue;
    }
    for (const [index, line] of (slip.lines || []).entries()) {
      const row = { source_type: 'KitchenReleaseSlip', source_id: slip.id, source_updated_date: slip.updated_date, line_index: index, reservation_id: line.reservation_id, inventory_item_id: line.inventory_item_id, item_name: line.inventory_item_name, unit: line.unit, actual_quantity: line.actual_quantity, fulfilled_date: slip.fulfilled_date, sign: 1, amount: 0 };
      if (line.reservation_id && seenReservations.has(line.reservation_id)) {
        flag(warnings, 'duplicate_release_reservation', slip.id, line.reservation_id);
        rows.push({ ...row, excluded: 'duplicate_release_reservation' }); continue;
      }
      if (line.reservation_id) seenReservations.add(line.reservation_id);
      if (slip.branch_id !== event.branch_id) { flag(warnings, 'source_branch_mismatch', slip.id); rows.push({ ...row, excluded: 'source_branch_mismatch' }); continue; }
      valued(row, numberOrNull(line.actual_quantity), purchaseRate(invoices, line.inventory_item_id, line.unit, slip.fulfilled_date, unitRules));
    }
  }
  for (const record of waste) {
    const row = { source_type: 'WasteDeclaration', source_id: record.id, source_updated_date: record.updated_date, inventory_item_id: record.inventory_item_id, quantity_wasted: record.quantity_wasted, unit: record.unit, cost_treatment: record.catering_cost_treatment, status: record.status, sign: 1, amount: 0 };
    if (record.status !== 'approved') {
      rows.push({ ...row, excluded: 'not_approved' });
      if (record.status !== 'rejected') flag(warnings, 'waste_pending_approval', record.id);
    } else if (record.branch_id !== event.branch_id) { flag(warnings, 'source_branch_mismatch', record.id); rows.push({ ...row, excluded: 'source_branch_mismatch' }); }
    else if (record.catering_cost_treatment === 'included_in_release') rows.push({ ...row, excluded: 'already_in_gross_release_cost' });
    else if (record.catering_cost_treatment !== 'additional') { flag(warnings, 'waste_cost_treatment_missing', record.id); rows.push({ ...row, excluded: 'waste_cost_treatment_missing' }); }
    else valued(row, numberOrNull(record.quantity_wasted), purchaseRate(invoices, record.inventory_item_id, record.unit, record.waste_date || record.created_date, unitRules));
  }
  for (const record of returns) {
    const row = { source_type: 'CateringReturnedItem', source_id: record.id, source_updated_date: record.updated_date, inventory_item_id: record.inventory_item_id, item_name: record.item_name, quantity: record.quantity, unit: record.unit, condition: record.condition, disposition: record.disposition, sign: -1, amount: 0 };
    if (record.condition !== 'reusable' || record.disposition !== 'returned_to_stock') {
      rows.push({ ...row, excluded: 'not_a_usable_stock_return' });
      if (record.disposition === 'pending') flag(warnings, 'return_disposition_pending', record.id);
      continue;
    }
    if (record.branch_id !== event.branch_id) { flag(warnings, 'source_branch_mismatch', record.id); rows.push({ ...row, excluded: 'source_branch_mismatch' }); continue; }
    let rate;
    if (record.inventory_item_id) {
      const issued = rows.filter(r => {
        if (r.source_type !== 'KitchenReleaseSlip' || r.excluded || r.inventory_item_id !== record.inventory_item_id || !(Number(r.actual_quantity) > 0) || r.valuation?.unit_cost === undefined) return false;
        const conv = resolveConversionFactor(record.unit, r.unit, { itemId: record.inventory_item_id, rules: unitRules });
        return conv.ok;
      });
      if (issued.length > 0) {
        let totalVal = 0, totalQtyInReturnUnit = 0;
        for (const r of issued) {
          const conv = resolveConversionFactor(r.unit, record.unit, { itemId: record.inventory_item_id, rules: unitRules });
          const factor = conv.ok ? conv.factor : 1;
          totalVal += Number(r.actual_quantity) * r.valuation.unit_cost;
          totalQtyInReturnUnit += Number(r.actual_quantity) * factor;
        }
        rate = totalQtyInReturnUnit > 0
          ? { method: 'weighted_original_release_cost', unit_cost: totalVal / totalQtyInReturnUnit, release_source_ids: issued.map(r => ({ slip_id: r.source_id, line_index: r.line_index })) }
          : purchaseRate(invoices, record.inventory_item_id, record.unit, event.event_date, unitRules);
      } else {
        rate = purchaseRate(invoices, record.inventory_item_id, record.unit, event.event_date, unitRules);
      }
    } else {
      const cost = numberOrNull(record.unit_cost);
      rate = cost > 0 ? { method: 'recorded_manual_return_value', unit_cost: cost } : { error: 'return_cost_missing' };
      flag(warnings, 'return_manual_valuation', record.id, 'No material ID/purchase history link: recorded per-unit return credit used, requires review.');
    }
    valued(row, numberOrNull(record.quantity), rate);
  }
  return { total: sumAmounts(rows), rows, release_cost: sumAmounts(rows.filter(r => r.source_type === 'KitchenReleaseSlip')), additional_waste_cost: sumAmounts(rows.filter(r => r.source_type === 'WasteDeclaration')), return_credit: -sumAmounts(rows.filter(r => r.source_type === 'CateringReturnedItem')) };
}