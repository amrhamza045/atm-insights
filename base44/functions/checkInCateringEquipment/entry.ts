import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { checkPermission } from '../../shared/requirePermission.js';
import { assertEventBranch, numberOrNull, roundMoney } from '../../shared/cateringActualCostCommon.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const permission = await checkPermission(base44, user, 'catering_edit');
    if (!permission.allowed) return Response.json({ error: permission.reason }, { status: permission.status });
    const body = await req.json();
    const entities = base44.asServiceRole.entities;
    if (!body.reservation_id) return Response.json({ error: 'Reservation is required' }, { status: 400 });
    const reservation = await entities.CateringEquipmentReservation.get(body.reservation_id);
    if (!reservation) return Response.json({ error: 'Reservation not found' }, { status: 404 });
    const event = await entities.CateringEvent.get(reservation.event_id);
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
    assertEventBranch(user, permission.permissions, event);
    if (reservation.status === 'returned') return Response.json({ success: true, already_returned: true });
    if (!['reserved', 'dispatched'].includes(reservation.status)) return Response.json({ error: 'Only reserved or dispatched equipment can be checked in' }, { status: 409 });
    const returned = numberOrNull(body.returned_quantity), damaged = numberOrNull(body.damaged_quantity), missing = numberOrNull(body.missing_quantity);
    if ([returned, damaged, missing].some(v => v === null || v < 0 || !Number.isInteger(v)) || returned + damaged + missing !== Number(reservation.quantity)) return Response.json({ error: 'Nonnegative whole quantities must total the reserved quantity' }, { status: 400 });
    const damageCost = numberOrNull(body.damage_cost);
    if (damaged > 0 && !(damageCost > 0)) return Response.json({ error: 'Enter the total damage repair cost in EGP (greater than zero)' }, { status: 400 });
    const equipment = await entities.CateringEquipment.get(reservation.equipment_id);
    const replacement = numberOrNull(equipment?.replacement_cost);
    if (missing > 0 && !(replacement > 0)) return Response.json({ error: 'Set the equipment catalog replacement cost before checking in missing pieces' }, { status: 400 });
    if (damaged > 0) {
      const key = `return:${reservation.id}`;
      const existing = await entities.CateringEquipmentMaintenance.filter({ checkin_key: key });
      const damage = { checkin_key: key, reservation_id: reservation.id, equipment_id: reservation.equipment_id, equipment_name: reservation.equipment_name, unit_id: reservation.unit_id || '', unit_code: reservation.unit_code || '', record_type: 'damage', status: 'open', quantity_affected: damaged, cost: roundMoney(damageCost), description: String(body.notes || 'Damaged on event return'), event_id: event.id, event_name: event.event_name, reported_by: user.email };
      if (existing[0]) await entities.CateringEquipmentMaintenance.update(existing[0].id, damage);
      else await entities.CateringEquipmentMaintenance.create(damage);
    }
    if (reservation.unit_id && missing === 0) await entities.CateringEquipmentUnit.update(reservation.unit_id, { status: damaged > 0 ? 'damaged' : 'available', current_location_type: 'branch', current_location_name: equipment?.home_branch_name || equipment?.storage_location || '', current_event_id: '', current_event_name: '' });
    await entities.CateringEquipmentReservation.update(reservation.id, { status: 'returned', returned_date: new Date().toISOString(), returned_by: user.email, returned_quantity: returned, damaged_quantity: damaged, missing_quantity: missing, missing_cost: roundMoney(missing * (replacement || 0)), replacement_unit_cost_snapshot: replacement || 0, replacement_cost_basis: 'checkin_snapshot', return_notes: String(body.notes || '') });
    return Response.json({ success: true });
  } catch (error) { return Response.json({ error: error.message }, { status: error.status || 500 }); }
}