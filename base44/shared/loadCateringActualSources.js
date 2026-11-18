import { readAll, businessDay, setBusinessOffset } from './cateringActualCostCommon.js';
import { getCompanyOffset } from './companyTimezone.js';
import { loadConversionRules } from './unitConversion.js';

export async function loadActualSources(entities, event) {
  setBusinessOffset(await getCompanyOffset(entities));
  const filter = { event_id: event.id };
  const [allSlips, waste, returns, shifts, assignments, equipmentReservations, maintenance, reconciliations, quotes, exceptions, unitRules] = await Promise.all([
    readAll(entities.KitchenReleaseSlip, filter), readAll(entities.WasteDeclaration, filter),
    readAll(entities.CateringReturnedItem, filter), readAll(entities.Shift, { catering_event_id: event.id }),
    readAll(entities.CateringAssignment, filter), readAll(entities.CateringEquipmentReservation, filter),
    readAll(entities.CateringEquipmentMaintenance, filter), readAll(entities.CateringReconciliation, filter),
    readAll(entities.CateringQuote, filter), readAll(entities.CateringCostException, { event_id: event.id, status: 'active' }),
    loadConversionRules(entities),
  ]);
  const isBatch = s => !!(s.requisition_id || s.is_requisition_batch);
  const slips = [
    ...allSlips.filter(s => !isBatch(s)),
    ...allSlips.filter(s => isBatch(s) && ['released', 'received'].includes(s.status)).map(s => ({ ...s, status: 'fulfilled', batch_status: s.status })),
  ];
  const shiftIds = shifts.map(s => s.id);
  const equipmentIds = [...new Set(equipmentReservations.map(r => r.equipment_id).filter(Boolean))];
  const materialIds = [...new Set([...slips.flatMap(s => (s.lines || []).map(l => l.inventory_item_id)), ...waste.map(w => w.inventory_item_id), ...returns.map(r => r.inventory_item_id)].filter(Boolean))];
  const dates = [event.event_date, ...slips.map(s => s.fulfilled_date), ...waste.map(w => w.waste_date || w.created_date)].map(businessDay).filter(Boolean).sort();
  const [attendance, equipment, invoices] = await Promise.all([
    shiftIds.length ? readAll(entities.Attendance, { shift_id: { $in: shiftIds } }) : [],
    equipmentIds.length ? readAll(entities.CateringEquipment, { id: { $in: equipmentIds } }) : [],
    materialIds.length && dates.length ? readAll(entities.PurchaseInvoice, { branch_id: event.branch_id, invoice_date: { $lte: dates[dates.length - 1] }, 'items.inventory_item_id': { $in: materialIds } }) : [],
  ]);
  reconciliations.sort((a, b) => String(b.finalized_date || b.updated_date).localeCompare(String(a.finalized_date || a.updated_date)));
  const reconciliation = reconciliations.find(r => r.status === 'finalized') || null;
  const quote = quotes.find(q => q.id === (reconciliation?.quote_id || event.active_quote_id)) || null;
  const [packages, eventTypeRules, systemSettings] = await Promise.all([
    quote?.package_id ? readAll(entities.CateringPackage, { id: quote.package_id }) : [],
    event.event_type ? readAll(entities.CateringEventTypeDiscount, { event_type: event.event_type, branch_id: event.branch_id, is_active: true }) : [],
    readAll(entities.SystemSettings, { setting_key: 'default' }),
  ]);
  eventTypeRules.sort((a, b) => String(b.created_date).localeCompare(String(a.created_date)));
  return { event, exceptions, slips, waste, returns, shifts, assignments, equipmentReservations, maintenance, reconciliations, reconciliation, quote, attendance, equipment, invoices, unitRules, packageRecord: packages[0] || null, eventTypeRule: eventTypeRules[0] || null, settings: systemSettings[0] || null };
}