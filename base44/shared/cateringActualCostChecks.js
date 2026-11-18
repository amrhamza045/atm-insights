import { calculateActualCosts, cancelledActualCosts } from './cateringActualCostCalculation.js';
import { invoiceRate, purchaseRate } from './cateringPurchaseRates.js';

export function checkActualCostCalculation() {
  const checks = [];
  const equal = (name, actual, expected) => { if (Math.abs(actual - expected) > 0.00001 || actual == null) throw new Error(`${name}: expected ${expected}, got ${actual}`); checks.push(name); };
  const assert = (name, value) => { if (!value) throw new Error(name); checks.push(name); };
  const invoice = { id: 'test-invoice', branch_id: 'b', invoice_date: '2026-01-01', items: [{ inventory_item_id: 'flour', unit: 'kg', unit_type: 'weight', quantity: 10, purchase_price: 20, total_cost: 200, pieces_count: 40 }] };
  equal('kg to grams', invoiceRate(invoice.items[0], 'g').unit_cost, 0.02);
  equal('weight purchase to counted pieces', invoiceRate(invoice.items[0], 'pcs').unit_cost, 5);
  assert('unknown package conversion excluded', !!invoiceRate(invoice.items[0], 'carton').error);
  assert('contradictory purchase unit excluded', invoiceRate({ ...invoice.items[0], unit_type: 'pcs' }, 'kg').error === 'invoice_unit_conflict');
  assert('future invoices excluded', !!purchaseRate([invoice], 'flour', 'kg', '2025-12-31').error);
  const sources = {
    event: { id: 'test-event', branch_id: 'b', event_date: '2026-01-02', total_paid: 500, estimated_labor_cost: 40 },
    quote: { id: 'q', total: 500, estimated_cost: 100, estimated_margin: 400, line_items: [{ quantity: 1, unit_cost: 60, line_cost: 60, cost_category: 'food' }, { quantity: 1, unit_cost: 40, line_cost: 40, cost_category: 'other' }] }, reconciliations: [{ id: 'rec', status: 'finalized', final_billing_total: 500 }], reconciliation: { id: 'rec', final_billing_total: 500, additional_charges: [{ category: 'equipment_damage', amount: 20 }] },
    slips: [{ id: 'slip', branch_id: 'b', status: 'fulfilled', fulfilled_date: '2026-01-02T10:00:00Z', lines: [{ reservation_id: 'stock', inventory_item_id: 'flour', unit: 'kg', actual_quantity: 4 }] }],
    waste: [{ id: 'w1', branch_id: 'b', status: 'approved', catering_cost_treatment: 'additional', inventory_item_id: 'flour', quantity_wasted: 1, unit: 'kg', waste_date: '2026-01-02' }, { id: 'w2', branch_id: 'b', status: 'approved', catering_cost_treatment: 'included_in_release', inventory_item_id: 'flour', quantity_wasted: 1, unit: 'kg' }],
    returns: [{ id: 'return', branch_id: 'b', inventory_item_id: 'flour', unit: 'kg', quantity: 1, condition: 'reusable', disposition: 'returned_to_stock' }],
    invoices: [invoice], shifts: [{ id: 'shift', catering_assignment_id: 'a', employee_id: 'emp' }], assignments: [{ id: 'a', event_id: 'test-event', shift_id: 'shift', employee_id: 'emp', estimated_cost: 10, expected_hours: 1 }],
    attendance: [{ id: 'att', shift_id: 'shift', employee_id: 'emp', review_status: 'approved', hours_worked: 2, sign_in_time: '2026-01-02T10:00:00Z', sign_out_time: '2026-01-02T12:00:00Z' }],
    equipmentReservations: [{ id: 'eqr', equipment_id: 'eq', status: 'returned', missing_quantity: 2, replacement_unit_cost_snapshot: 50, replacement_cost_basis: 'checkin_snapshot' }], equipment: [], maintenance: [{ id: 'damage', record_type: 'damage', cost: 30 }],
  };
  const result = calculateActualCosts(sources);
  equal('food release plus additional waste minus usable returns', result.fields.actual_food_cost, 80);
  equal('actual attendance times assignment rate', result.fields.actual_labor_cost, 20);
  equal('equipment damage plus missing pieces', result.fields.actual_equipment_cost, 130);
  equal('three category total', result.fields.actual_total_cost, 230);
  equal('margin from final revenue', result.fields.actual_margin, 270);
  equal('margin percent', result.fields.actual_margin_percentage, 54);
  equal('restaurant margin fallback', result.fields.applicable_target_margin_percentage, 30);
  assert('restaurant margin source', result.fields.applicable_target_margin_source === 'restaurant-default');
  assert('margin classified on target', result.fields.loss_analysis_status === 'on_target');
  equal('margin bridge expected delta', result.bridge.expected_delta, -130);
  equal('margin bridge reconciles', result.bridge.total_delta, -130);
  assert('margin bridge consistency exact', result.bridge.consistent && result.bridge.mismatch_amount === 0);
  assert('equipment ranks first', result.bridge.ranking[0].key === 'equipment_cost_variance');
  assert('equipment recovery remains separate', result.bridge.lines.find(line => line.key === 'client_recovered_equipment_costs').delta === 20);
  assert('cancelled actuals null', cancelledActualCosts(sources.event).fields.actual_food_cost === null);
  const empty = calculateActualCosts({ ...sources, slips: [], waste: [], returns: [], attendance: [], shifts: [], assignments: [], equipmentReservations: [], maintenance: [] });
  equal('empty food sources yield zero', empty.fields.actual_food_cost, 0);
  assert('empty sources flagged incomplete', empty.fields.actual_cost_status === 'incomplete');
  return { passed: checks.length, checks, fixture_only: true, records_written: 0 };
}