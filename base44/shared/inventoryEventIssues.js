import { requireValue } from './financeValidation.js';

const share = (cost, part, whole) => (part >= whole - 1e-8 ? Number(cost) : Number(cost) * part / whole);

// Everything issued to one event at carrying cost, in stock units, by source:
// released requisition stock (planned or extra) and event production held in custody.
// Delivered quantities are a floor; stock a production batch consumed from custody is
// left out because that batch's output already carries its cost.
export async function eventIssuedStock(ctx, company, event, deliveries) {
  const db = ctx.svc.entities, delivered = new Map(), lines = [], ids = [];
  for (const m of deliveries) delivered.set(m.resource_id, (delivered.get(m.resource_id) || 0) + (Number(m.quantity) || 0));

  const slips = await db.KitchenReleaseSlip.filter({ event_id: event.id }, { limit: 200 });
  requireValue(!slips.has_more, 'Too many release slips for one event.');
  const slipById = new Map(slips.items.map((s) => [s.id, s]));
  const custody = slipById.size ? await db.InventoryAccountingMovement.filter({ company_id: company.id, kind: 'custody_issue', status: 'applied', source_entity: 'KitchenReleaseSlip', source_id: { $in: [...slipById.keys()] } }, { limit: 500 }) : { items: [] };
  requireValue(!custody.has_more, 'Too many released stock lines for one event.');
  for (const m of custody.items) {
    const it = m.snapshot.items[0], line = (slipById.get(m.source_id)?.lines || []).find((l) => l.reservation_id === m.resource_id);
    const reservation = await db.CateringReservation.get(m.resource_id).catch(() => null);
    const usedRaw = Number(reservation?.custody_consumed_quantity) || 0, raw = Number(it.source_quantity) || 0;
    const used = raw > 0 ? Math.min(it.quantity, usedRaw * it.quantity / raw) : 0;
    const quantity = Math.max(delivered.get(`stock:${m.resource_id}`) || 0, it.quantity - used);
    if (quantity <= 1e-8) continue;
    lines.push({ inventory_item_id: it.inventory_item_id, category_id: it.category_id, unit: it.unit, quantity, cost: share(it.cost, quantity, it.quantity), issue_type: line?.line_type === 'extra' ? 'extra' : 'planned' });
    ids.push(m.id);
  }

  const orders = await db.ProductionOrder.filter({ catering_event_id: event.id, status: 'completed' }, { limit: 200 });
  requireValue(!orders.has_more, 'Too many production batches for one event.');
  const orderById = new Map(orders.items.map((o) => [o.id, o]));
  const made = orderById.size ? await db.InventoryAccountingMovement.filter({ company_id: company.id, kind: 'production', status: 'applied', source_entity: 'ProductionOrder', source_id: { $in: [...orderById.keys()] } }, { limit: 500 }) : { items: [] };
  requireValue(!made.has_more, 'Too many production cost records for one event.');
  for (const m of made.items) {
    const out = m.snapshot.output, order = orderById.get(m.source_id), raw = Number(out.source_quantity) || 0;
    const held = order.custody_output_quantity != null && raw > 0 ? Math.min(out.quantity, Number(order.custody_output_quantity) * out.quantity / raw) : out.quantity;
    const quantity = Math.max(delivered.get(`production:${order.id}`) || 0, held);
    if (quantity <= 1e-8) continue;
    lines.push({ inventory_item_id: out.inventory_item_id, category_id: out.category_id, unit: out.unit, quantity, cost: share(out.cost, quantity, out.quantity), issue_type: 'production' });
    ids.push(m.id);
  }
  return { lines, ids };
}