import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { recomputeActualEvent } from '../../shared/cateringActualCostPersist.js';
import { checkPermission } from '../../shared/requirePermission.js';
import { getJobNumber } from '../../shared/scheduleGate.js';
import { getCompanyOffset, TIMEZONE_MISSING } from '../../shared/companyTimezone.js';

const round = (n, digits = 2) => Number(Number(n).toFixed(digits));
const isoAt = (day, hour = 12) => `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`;
const unitKey = (value) => String(value || '').trim().toLowerCase();

function usableRates(invoices, event) {
  const applicable = invoices.filter((invoice) => invoice.branch_id === event.branch_id && invoice.invoice_date <= event.event_date)
    .sort((a, b) => String(b.invoice_date).localeCompare(String(a.invoice_date)));
  const seen = new Set(), rates = [];
  for (const invoice of applicable) {
    for (const line of invoice.items || []) {
      if (!line.inventory_item_id || seen.has(line.inventory_item_id) || !line.unit || !(Number(line.quantity) > 0)) continue;
      const same = (invoice.items || []).filter((item) => item.inventory_item_id === line.inventory_item_id);
      if (same.some((item) => unitKey(item.unit) !== unitKey(line.unit))) continue;
      const quantity = same.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const total = same.reduce((sum, item) => sum + Number(item.total_cost ?? Number(item.quantity || 0) * Number(item.purchase_price || 0)), 0);
      if (!(quantity > 0) || !(total > 0)) continue;
      seen.add(line.inventory_item_id);
      rates.push({ id: line.inventory_item_id, name: line.inventory_item_name || 'Event ingredient', unit: line.unit, rate: total / quantity });
    }
  }
  return rates.slice(0, 3);
}

// Start times are company-local, so shift by the company offset to store UTC.
function attendanceTimes(event, assignment, hours, cfg) {
  const startHour = Number(String(assignment.start_time || event.start_time || '').split(':')[0]) || cfg.startHour;
  const start = new Date(new Date(isoAt(event.event_date || event.shift_date, startHour)).getTime() - cfg.offset * 60000);
  const end = new Date(start.getTime() + hours * 3600000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const permission = await checkPermission(base44, user, 'catering_finance');
    if (!permission.allowed) return Response.json({ error: permission.reason }, { status: permission.status });
    const body = await req.json();
    const limit = Math.min(Math.max(Number(body.limit) || 7, 1), 10);
    const entities = base44.asServiceRole.entities;
    const offset = await getCompanyOffset(entities);
    if (offset === null) return Response.json({ error: TIMEZONE_MISSING }, { status: 409 });
    const cfg = {
      offset,
      expectedHours: await getJobNumber(base44.asServiceRole, 'catering_default_expected_hours'),
      minHours: await getJobNumber(base44.asServiceRole, 'catering_min_actual_hours'),
      startHour: await getJobNumber(base44.asServiceRole, 'catering_default_start_hour'),
    };
    const startLabel = `${String(cfg.startHour).padStart(2, '0')}:00`;
    const [events, quotes, assignments, invoices, equipment] = await Promise.all([
      entities.CateringEvent.filter({ status: 'completed', loss_analysis_status: 'insufficient_data' }, 'event_date', 100),
      entities.CateringQuote.list('-created_date', 1000), entities.CateringAssignment.list('-created_date', 3000),
      entities.PurchaseInvoice.list('-invoice_date', 1000), entities.CateringEquipment.list('-created_date', 500),
    ]);
    const eligible = events.map((event) => ({
      event,
      rates: usableRates(invoices, event),
      quote: quotes.find((item) => item.id === event.active_quote_id) || quotes.find((item) => item.event_id === event.id),
      crew: assignments.filter((item) => item.event_id === event.id && item.status === 'confirmed' && Number(item.estimated_cost) > 0 && Number(item.expected_hours) > 0),
    })).filter((item) => item.rates.length >= 3 && item.quote && item.crew.length).slice(0, limit);
    if (!eligible.length) return Response.json({ populated: [], message: 'No remaining events have both pre-event purchase history and confirmed assignments.' });
    const shiftRows = [], eventPlans = [];
    eligible.forEach(({ event, rates, quote, crew }, index) => {
      const scenario = body.scenarios?.[index] || (index % 3 === 0 ? 'loss' : index % 3 === 1 ? 'underperforming' : 'on_target');
      const hourFactor = scenario === 'loss' ? 1.42 + (index % 3) * 0.04 : scenario === 'underperforming' ? 1.18 : 0.96 + (index % 2) * 0.08;
      let laborCost = 0;
      crew.forEach((assignment) => {
        const hours = round(Math.max(cfg.minHours, Number(assignment.expected_hours || cfg.expectedHours) * hourFactor), 2);
        laborCost += hours * (Number(assignment.estimated_cost) / Number(assignment.expected_hours));
        shiftRows.push({ branch_id: event.branch_id, branch_name: event.branch_name, employee_id: assignment.employee_id, employee_name: assignment.employee_name, shift_date: event.event_date, start_time: assignment.start_time || startLabel, end_time: assignment.end_time || '20:00', expected_hours: Number(assignment.expected_hours || cfg.expectedHours), shift_source: 'catering', catering_event_id: event.id, catering_event_name: event.event_name, catering_assignment_id: assignment.id, catering_role: assignment.role_name, status: 'completed', notes: 'Actual-cost history population', _hours: hours, _assignment: assignment });
      });
      const expectedFood = (quote.line_items || []).filter((line) => (line.cost_category || 'food') === 'food').reduce((sum, line) => sum + Number(line.line_cost ?? Number(line.quantity || 0) * Number(line.unit_cost || 0)), 0) || Number(quote.estimated_cost) || Number(quote.total) * 0.25;
      const foodFactor = scenario === 'loss' ? 1.75 + (index % 2) * 0.12 : scenario === 'underperforming' ? 1.28 + (index % 2) * 0.08 : 0.92 + (index % 3) * 0.06;
      const targetRelease = expectedFood * foodFactor;
      const slipLines = rates.map((rate, lineIndex) => {
        const actual = round(targetRelease / rates.length / rate.rate, 3);
        const variance = [0.94, 1.07, 1.12][(index + lineIndex) % 3];
        return { reservation_id: `actual-${event.id}-${lineIndex}`, inventory_item_id: rate.id, inventory_item_name: rate.name, unit: rate.unit, purpose: 'stock_pull', quantity_reserved: round(actual / variance, 3), shortfall_quantity: 0, needed_by_date: event.event_date, actual_quantity: actual, variance_quantity: round(actual - actual / variance, 3) };
      });
      const releaseCost = slipLines.reduce((sum, line, i) => sum + line.actual_quantity * rates[i].rate, 0);
      eventPlans.push({ event, quote, scenario, rates, slipLines, releaseCost, laborCost: round(laborCost), index });
    });
    const cleanShifts = shiftRows.map(({ _hours, _assignment, ...row }) => row);
    const createdShifts = cleanShifts.length ? await entities.Shift.bulkCreate(cleanShifts) : [];
    const attendanceRows = [], assignmentUpdates = [];
    createdShifts.forEach((shift, index) => {
      const source = shiftRows[index], hours = source._hours, assignment = source._assignment;
      const times = attendanceTimes(source, assignment, hours, cfg);
      attendanceRows.push({ branch_id: shift.branch_id, branch_name: shift.branch_name, employee_id: shift.employee_id, employee_name: shift.employee_name, shift_id: shift.id, attendance_date: shift.shift_date, sign_in_time: times.start, sign_out_time: times.end, hours_worked: hours, status: 'completed', admin_approved: true, review_status: 'approved', approved_by: user.email, approved_date: new Date().toISOString(), shift_expected_hours: shift.expected_hours, regular_hours: Math.min(hours, shift.expected_hours), overtime_hours: round(Math.max(0, hours - shift.expected_hours)), calculated_earnings: round(hours * Number(assignment.hourly_rate)), notes: 'Approved event attendance' });
      assignmentUpdates.push({ id: assignment.id, shift_id: shift.id });
    });
    if (attendanceRows.length) await entities.Attendance.bulkCreate(attendanceRows);
    if (assignmentUpdates.length) await entities.CateringAssignment.bulkUpdate(assignmentUpdates);
    const slips = [], wastes = [], returns = [], reservations = [], maintenance = [], reconciliations = [];
    const equipmentPool = equipment.filter((item) => item.is_active !== false && Number(item.replacement_cost) > 0);
    eventPlans.forEach((plan) => {
      const { event, quote, scenario, rates, slipLines, index } = plan;
      slips.push({ branch_id: event.branch_id, branch_name: event.branch_name, event_id: event.id, event_name: event.event_name, event_date: event.event_date, slip_number: `ACT-${event.id.slice(-10)}`, needed_by_date: event.event_date, status: 'fulfilled', shortfall_count: 0, lines: slipLines, created_from_quote_id: quote.id, fulfilled_by: user.email, fulfilled_date: isoAt(event.event_date, 12) });
      let foodAdjustment = 0;
      if (index % 2 === 0) { const qty = round(plan.releaseCost * 0.025 / rates[0].rate, 3); foodAdjustment += qty * rates[0].rate; wastes.push({ branch_id: event.branch_id, branch_name: event.branch_name, event_id: event.id, catering_cost_treatment: 'additional', waste_date: event.event_date, inventory_item_id: rates[0].id, inventory_item_name: rates[0].name, quantity_wasted: qty, unit: rates[0].unit, reason: index % 4 === 0 ? 'overproduction' : 'preparation_error', notes: 'Event closeout waste', cost_impact: round(qty * rates[0].rate), declared_by: user.email, status: 'approved', approved_by: user.email }); }
      if (index % 3 === 2) { const qty = round(plan.releaseCost * 0.018 / rates[1].rate, 3); foodAdjustment -= qty * rates[1].rate; returns.push({ branch_id: event.branch_id, branch_name: event.branch_name, event_id: event.id, event_name: event.event_name, event_date: event.event_date, inventory_item_id: rates[1].id, item_name: rates[1].name, category: 'raw_material', quantity: qty, unit: rates[1].unit, unit_cost: round(rates[1].rate), total_value: round(qty * rates[1].rate), condition: 'reusable', disposition: 'returned_to_stock', recorded_by: user.email, notes: 'Unused sealed stock returned after event' }); }
      let equipmentCost = 0, recovery = 0;
      if (equipmentPool.length && index % 4 === 0) {
        const item = equipmentPool[index % equipmentPool.length], missing = index % 8 === 0 ? 1 : 0, damageCost = round(Math.max(450, Number(quote.total) * (scenario === 'loss' ? 0.07 : 0.018)));
        const reservationKey = `actual-equipment-${event.id}`;
        equipmentCost = damageCost + missing * Number(item.replacement_cost); recovery = index % 8 === 0 ? round(equipmentCost * 0.65) : 0;
        reservations.push({ branch_id: event.branch_id, branch_name: event.branch_name, event_id: event.id, event_name: event.event_name, event_date: event.event_date, equipment_id: item.id, equipment_name: item.name, tracking_mode: item.tracking_mode || 'bulk', quantity: 6, unit_label: item.unit_label || 'pcs', status: 'returned', returned_date: isoAt(event.event_date, 23), returned_by: user.email, returned_quantity: 5 - missing, damaged_quantity: 1, missing_quantity: missing, replacement_unit_cost_snapshot: Number(item.replacement_cost), replacement_cost_basis: 'checkin_snapshot', return_notes: 'Event closeout inspection', notes: reservationKey, _key: reservationKey, _damage: damageCost });
      }
      const predictedCost = plan.releaseCost + foodAdjustment + plan.laborCost + equipmentCost;
      const marginPct = scenario === 'loss' ? -0.18 - (index % 3) * 0.03 : scenario === 'underperforming' ? 0.18 + (index % 3) * 0.04 : 0.42 + (index % 3) * 0.04;
      const finalTotal = round(predictedCost / (1 - marginPct));
      const adjustment = round(finalTotal - Number(quote.total) - recovery);
      const charges = [];
      if (adjustment) charges.push({ label: adjustment < 0 ? 'Contractual post-event discount' : 'Additional event services', amount: adjustment, category: 'other' });
      if (recovery) charges.push({ label: 'Client recovery for damaged or missing equipment', amount: recovery, category: 'equipment_damage' });
      const chargesTotal = round(charges.reduce((sum, charge) => sum + charge.amount, 0));
      reconciliations.push({ branch_id: event.branch_id, branch_name: event.branch_name, event_id: event.id, event_name: event.event_name, event_date: event.event_date, client_id: event.client_id, client_name: event.client_name, expected_guests: event.expected_guests, guaranteed_guests: event.guaranteed_guests || event.expected_guests, actual_guests: Math.max(1, Math.round(Number(event.expected_guests) * (0.94 + (index % 5) * 0.025))), guarantee_locked: true, billable_guests: event.guaranteed_guests || event.expected_guests, billing_basis: adjustment < 0 ? 'Guaranteed guests less an approved contractual service discount' : 'Guaranteed guests plus approved event additions', quote_total: Number(quote.total), quote_id: quote.id, guest_adjustment: 0, additional_charges: charges, additional_charges_total: chargesTotal, final_billing_total: round(Number(quote.total) + chargesTotal), total_paid: event.total_paid || 0, final_balance_due: round(finalTotal - Number(event.total_paid || 0)), equipment_returned_count: equipmentCost ? 5 : 0, equipment_outstanding_count: 0, equipment_damaged_count: equipmentCost ? 1 : 0, equipment_missing_count: recovery ? 1 : 0, inventory_released: true, post_event_notes: `Completed actual-cost scenario: ${scenario}`, client_rating: 4, status: 'finalized', finalized_by: user.email, finalized_date: isoAt(event.event_date, 23) });
    });
    const createdReservations = reservations.length ? await entities.CateringEquipmentReservation.bulkCreate(reservations.map(({ _key, _damage, ...row }) => row)) : [];
    createdReservations.forEach((reservation, index) => { const source = reservations[index]; maintenance.push({ equipment_id: reservation.equipment_id, equipment_name: reservation.equipment_name, reservation_id: reservation.id, checkin_key: source._key, record_type: 'damage', status: 'resolved', quantity_affected: 1, description: 'Repair identified during event equipment check-in', resolved_date: isoAt(reservation.event_date, 23), cost: source._damage, event_id: reservation.event_id, event_name: reservation.event_name, reported_by: user.email, resolved_by: user.email, notes: 'Event closeout damage record' }); });
    await Promise.all([slips.length && entities.KitchenReleaseSlip.bulkCreate(slips), wastes.length && entities.WasteDeclaration.bulkCreate(wastes), returns.length && entities.CateringReturnedItem.bulkCreate(returns), maintenance.length && entities.CateringEquipmentMaintenance.bulkCreate(maintenance), reconciliations.length && entities.CateringReconciliation.bulkCreate(reconciliations)]);
    const results = [];
    for (const plan of eventPlans) results.push(await recomputeActualEvent(base44, user, permission.permissions, plan.event.id));
    return Response.json({ populated: results.map((result, index) => ({ event_id: result.event_id, event_name: result.event_name, intended: eventPlans[index].scenario, status: result.fields.loss_analysis_status, actual_status: result.status, warnings: result.warning_codes, food: result.fields.actual_food_cost, labor: result.fields.actual_labor_cost, equipment: result.fields.actual_equipment_cost, revenue: result.fields.actual_revenue, margin: result.fields.actual_margin, margin_percentage: result.fields.actual_margin_percentage, run_id: result.run_id })) });
  } catch (error) { return Response.json({ error: error.message }, { status: error.status || 500 }); }
}