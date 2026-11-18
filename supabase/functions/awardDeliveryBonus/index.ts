import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';

// Awards delivery milestone bonuses for one delivered order.
// Amounts come only from DeliveryBonusTier; the delivery count comes from the
// actual delivered Order records — nothing the caller sends affects either.
async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { order_id } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id is required' }, { status: 400 });

    const svc = base44.asServiceRole.entities;
    const order = await svc.Order.get(order_id);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (!order.delivery_person_id) return Response.json({ error: 'Order has no driver' }, { status: 400 });
    if (order.delivery_status !== 'delivered') {
      return Response.json({ error: 'Order is not delivered yet' }, { status: 400 });
    }

    const person = await svc.DeliveryPerson.get(order.delivery_person_id);
    if (!person) return Response.json({ error: 'Driver not found' }, { status: 404 });

    // Caller must be the linked driver, or an admin / system (scheduled) call.
    const isLinkedDriver = !!person.email && person.email.toLowerCase() === (user.email || '').toLowerCase();
    if (!isLinkedDriver && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Duplicate guard: this delivery already triggered a bonus.
    const existing = await svc.DeliveryBonusRecord.filter({ delivery_person_id: person.id }, '-earned_date', 5000);
    if (existing.some(r => r.trigger_order_id === order.id)) {
      return Response.json({ success: true, awarded: [], reason: 'already_processed' });
    }

    const delivered = await svc.Order.filter({ delivery_person_id: person.id, delivery_status: 'delivered' }, '-created_date', 10000);
    const count = delivered.length;

    const tiers = (await svc.DeliveryBonusTier.filter({ is_active: true })).sort((a, b) => a.milestone_count - b.milestone_count);
    const now = new Date().toISOString();
    const awarded = [];

    for (const tier of tiers) {
      if (!tier.milestone_count || tier.milestone_count <= 0) continue;
      const tierRecords = existing.filter(r => r.bonus_tier_id === tier.id && r.status !== 'cancelled');
      let milestone = null;
      if (tier.recurrence_type === 'recurring') {
        const next = (tierRecords.length + 1) * tier.milestone_count;
        if (count >= next) milestone = next;
      } else if (tierRecords.length === 0 && count >= tier.milestone_count) {
        milestone = tier.milestone_count;
      }
      if (milestone === null) continue;

      const record = await svc.DeliveryBonusRecord.create({
        delivery_person_id: person.id,
        delivery_person_name: person.name,
        bonus_tier_id: tier.id,
        bonus_tier_name: tier.name,
        milestone_count: milestone,
        bonus_amount: tier.bonus_amount || 0,
        total_deliveries_at_time: count,
        trigger_order_id: order.id,
        status: 'pending',
        earned_date: now,
      });
      awarded.push({ id: record.id, tier_name: tier.name, bonus_amount: tier.bonus_amount || 0 });
    }

    const allRecords = [...existing, ...awarded.map(a => ({ bonus_amount: a.bonus_amount, status: 'pending' }))];
    const totalBonus = allRecords.filter(r => r.status !== 'cancelled').reduce((s, r) => s + (r.bonus_amount || 0), 0);
    await svc.DeliveryPerson.update(person.id, { total_deliveries: count, total_bonus_earnings: totalBonus });

    return Response.json({ success: true, total_deliveries: count, awarded });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const res = await handler(req);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
