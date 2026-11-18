import { numberOrNull, roundMoney, sumAmounts, flag } from './cateringActualCostCommon.js';

export function actualEquipment({ equipmentReservations, maintenance, equipment }, warnings) {
  const rows = [], updates = [];
  for (const record of maintenance.filter(m => m.record_type === 'damage')) {
    const cost = numberOrNull(record.cost);
    if (!(cost > 0)) flag(warnings, 'damage_cost_missing', record.id);
    rows.push({ source_type: 'CateringEquipmentMaintenance', source_id: record.id, source_updated_date: record.updated_date, equipment_id: record.equipment_id, reservation_id: record.reservation_id, quantity_affected: record.quantity_affected, cost: record.cost, basis: 'total_repair_cost_not_per_piece', amount: cost > 0 ? roundMoney(cost) : 0 });
  }
  for (const reservation of equipmentReservations.filter(r => r.status !== 'released')) {
    if (reservation.status !== 'returned') flag(warnings, 'equipment_not_checked_in', reservation.id);
    if (Number(reservation.damaged_quantity) > 0 && !maintenance.some(m => m.record_type === 'damage' && (m.reservation_id === reservation.id || (!m.reservation_id && m.equipment_id === reservation.equipment_id)))) flag(warnings, 'damage_record_missing', reservation.id);
    const missing = numberOrNull(reservation.missing_quantity) ?? 0;
    if (missing < 0) { flag(warnings, 'invalid_missing_quantity', reservation.id); continue; }
    if (!missing) {
      rows.push({ source_type: 'CateringEquipmentReservation', source_id: reservation.id, source_updated_date: reservation.updated_date, equipment_id: reservation.equipment_id, equipment_name: reservation.equipment_name, status: reservation.status, returned_quantity: reservation.returned_quantity, damaged_quantity: reservation.damaged_quantity, missing_quantity: missing, basis: 'no_missing_pieces', amount: 0 });
      if (Number(reservation.missing_cost)) updates.push({ id: reservation.id, missing_cost: 0 });
      continue;
    }
    const item = equipment.find(e => e.id === reservation.equipment_id);
    let rate = numberOrNull(reservation.replacement_unit_cost_snapshot);
    let basis = reservation.replacement_cost_basis;
    if (!(rate > 0)) { rate = numberOrNull(item?.replacement_cost); basis = 'catalog_at_backfill'; }
    if (!(rate > 0)) flag(warnings, 'equipment_replacement_cost_missing', reservation.id);
    if (basis !== 'checkin_snapshot') flag(warnings, 'replacement_cost_reconstructed', reservation.id, 'Current catalog price used; historical replacement price was not saved.');
    const amount = rate > 0 ? roundMoney(missing * rate) : 0;
    rows.push({ source_type: 'CateringEquipmentReservation', source_id: reservation.id, source_updated_date: reservation.updated_date, equipment_id: reservation.equipment_id, missing_quantity: missing, replacement_unit_cost: rate, basis, amount });
    updates.push({ id: reservation.id, missing_cost: amount, ...(rate > 0 ? { replacement_unit_cost_snapshot: rate, replacement_cost_basis: basis } : {}) });
  }
  return { total: sumAmounts(rows), rows, updates };
}