import { readAll, linked, cateringScope, replyHead, segments, num, round } from './executiveCateringCommon.js';
import { readFilter, filterEvents } from './executiveCateringFilter.js';
import { rangeBuckets } from './executivePeriod.js';

// Equipment & Returns for the Executive Dashboard: on the confirmed,
// in-progress and delivered events of the picker's branches dated in the
// period, the equipment booked (released bookings don't count), its usage
// cost, the pieces damaged or missing with their repair and replacement cost
// (the rules of each event's actual equipment cost), and the food and drink
// logged back after the events, beside the comparison period. The asset
// register (the whole catalog's value and straight-line depreciation, and the
// repairs still open) is a snapshot as of today. Every record is read on the
// server, so totals are never cut off.
const BOOKED = ['confirmed', 'in_progress', 'completed'];
const DISPOSITIONS = [['returned_to_stock', 'Back to stock'], ['staff_meal', 'Staff meals'], ['wasted', 'Wasted'], ['pending', 'Waiting for a decision']];
const CATEGORIES = { food: 'Food', beverage: 'Drinks', raw_material: 'Raw materials', packaging: 'Packaging', other: 'Other' };
const YEAR = 365.25 * 86400000;
const amount = (v) => num(v) ?? 0;
const total = (rows, f) => round(rows.reduce((s, r) => s + (f(r) || 0), 0));

// One booking: its pieces, usage cost (the booking's own rate when it was
// changed, else the catalog's) and missing pieces at the replacement price
// saved at check-in, else the catalog's.
function use(r, item, event) {
  const pieces = amount(r.quantity), missing = Math.max(0, amount(r.missing_quantity)), saved = amount(r.replacement_unit_cost_snapshot);
  const rate = saved > 0 ? saved : amount(item?.replacement_cost);
  return {
    kind: 'use', key: r.equipment_id || r.equipment_name || 'unknown', name: r.equipment_name || item?.name || 'Unnamed item',
    event: r.event_id, date: event?.event_date || r.event_date, pieces,
    usage: round((r.cost_overridden ? amount(r.usage_cost_per_event) : amount(item?.usage_cost_per_event)) * pieces),
    damaged_missing: amount(r.damaged_quantity) + missing, loss: round(missing * rate),
  };
}

// A damage record of an event: its repair cost is for the whole record, not per piece.
const repair = (m, item, event) => ({
  kind: 'repair', key: m.equipment_id || m.equipment_name || 'unknown', name: m.equipment_name || item?.name || 'Unnamed item',
  event: m.event_id, date: event?.event_date, pieces: 0, usage: 0, damaged_missing: 0, loss: round(Math.max(0, amount(m.cost))),
  id: m.id, unit_code: m.unit_code || '', event_name: event?.event_name || m.event_name || 'Untitled event',
  quantity: amount(m.quantity_affected) || 1, status: m.status || 'open',
});

const returned = (r, event) => ({
  id: r.id, event: r.event_id, event_name: event?.event_name || r.event_name || 'Untitled event', event_date: event?.event_date || r.event_date,
  item_name: r.item_name || 'Unnamed item', category: CATEGORIES[r.category] ? r.category : 'other', quantity: amount(r.quantity), unit: r.unit || '',
  total_value: num(r.total_value) ?? round(amount(r.quantity) * amount(r.unit_cost)), condition: r.condition || 'reusable',
  disposition: DISPOSITIONS.some(([key]) => key === r.disposition) ? r.disposition : 'pending',
});

async function booked(ctx, where, range, filter, catalog) {
  const E = ctx.svc.entities;
  const events = await filterEvents(ctx, await readAll(E.CateringEvent, { ...where, status: { $in: BOOKED }, event_date: { $gte: range.from, $lte: range.to } }), filter);
  const ids = events.map((e) => e.id), eventOf = new Map(events.map((e) => [e.id, e]));
  const [reservations, damage, back] = await Promise.all([
    linked(E.CateringEquipmentReservation, 'event_id', ids, { status: { $ne: 'released' } }),
    linked(E.CateringEquipmentMaintenance, 'event_id', ids, { record_type: 'damage' }),
    linked(E.CateringReturnedItem, 'event_id', ids),
  ]);
  return {
    events,
    uses: reservations.map((r) => use(r, catalog.get(r.equipment_id), eventOf.get(r.event_id))),
    repairs: damage.map((m) => repair(m, catalog.get(m.equipment_id), eventOf.get(m.event_id))),
    returns: back.map((r) => returned(r, eventOf.get(r.event_id))),
  };
}

const valueOf = (list, disposition) => total(list.filter((r) => r.disposition === disposition), (r) => r.total_value);
function totalsOf({ uses, repairs, returns }) {
  return {
    equipment_events: new Set(uses.map((u) => u.event)).size,
    pieces_booked: total(uses, (u) => u.pieces),
    usage_cost: total(uses, (u) => u.usage),
    damaged_missing: total(uses, (u) => u.damaged_missing),
    damage_loss_cost: total([...uses, ...repairs], (l) => l.loss),
    returned_value: total(returns, (r) => r.total_value),
    back_to_stock_value: valueOf(returns, 'returned_to_stock'),
    wasted_value: valueOf(returns, 'wasted'),
  };
}
const itemFigures = (lines) => totalsOf({ uses: lines.filter((l) => l.kind === 'use'), repairs: lines.filter((l) => l.kind === 'repair'), returns: [] });
const returnFigures = (list) => ({ items: list.length, returned_value: total(list, (r) => r.total_value), back_to_stock_value: valueOf(list, 'returned_to_stock'), wasted_value: valueOf(list, 'wasted') });

// Straight-line depreciation of a catalog item as of today: (purchase cost −
// salvage) ÷ useful life a year for each piece owned, accumulated since the
// purchase date up to the depreciable amount.
function depreciation(item, pieces, today) {
  const cost = amount(item.purchase_cost), life = amount(item.useful_life_years), salvage = amount(item.salvage_value_percentage) / 100;
  const depreciable = cost * (1 - salvage) * pieces, annual = life > 0 ? depreciable / life : 0;
  const age = item.purchase_date ? (Date.parse(today) - Date.parse(String(item.purchase_date).slice(0, 10))) / YEAR : 0;
  const value = cost * pieces, accumulated = Math.min(annual * (age > 0 ? age : 0), depreciable);
  return { id: item.id, name: item.name || 'Unnamed item', category: item.category || 'Other', pieces, unit_cost: cost, asset_value: round(value), annual: round(annual), book_value: round(value - accumulated) };
}

async function register(ctx, catalog, today) {
  const E = ctx.svc.entities;
  const [units, open] = await Promise.all([readAll(E.CateringEquipmentUnit, {}), readAll(E.CateringEquipmentMaintenance, { status: { $ne: 'resolved' } })]);
  const unitsOf = units.reduce((m, u) => m.set(u.equipment_id, (m.get(u.equipment_id) || 0) + 1), new Map());
  const rows = [...catalog.values()].filter((e) => e.is_active !== false)
    .map((e) => depreciation(e, e.tracking_mode === 'unit' ? unitsOf.get(e.id) || 0 : amount(e.total_quantity), today));
  return {
    items: rows.length, pieces: rows.reduce((s, r) => s + r.pieces, 0),
    asset_value: total(rows, (r) => r.asset_value), book_value: total(rows, (r) => r.book_value), annual_depreciation: total(rows, (r) => r.annual),
    open_repairs: open.length, open_repair_cost: total(open, (m) => Math.max(0, amount(m.cost))),
    depreciation: rows.filter((r) => r.unit_cost > 0).sort((a, b) => b.annual - a.annual || b.asset_value - a.asset_value),
  };
}

export async function cateringEquipment(ctx, input) {
  const scope = await cateringScope(ctx, input), { unit, period, comparison, where, today } = scope, filter = readFilter(input);
  if (!scope.isOn('assets_resources')) return { ...replyHead(scope), available: false, reason: 'module_off' };
  const catalog = new Map((await readAll(ctx.svc.entities.CateringEquipment, {})).map((e) => [e.id, e]));
  const [now, before, assets] = await Promise.all([booked(ctx, where, period, filter, catalog), booked(ctx, where, comparison, filter, catalog), register(ctx, catalog, today)]);
  const earlier = before.events.length ? before : null;
  const lines = (set) => [...set.uses, ...set.repairs];
  const cells = (set, range) => rangeBuckets(range, unit).map((b) => total(set.uses.filter((u) => u.date >= b.from && u.date <= b.to), (u) => u.pieces));
  const trend = cells(now, period), prior = earlier ? cells(earlier, comparison) : [];
  const names = Object.fromEntries([...lines(now), ...(earlier ? lines(earlier) : [])].map((l) => [l.key, l.name]));
  return {
    ...replyHead(scope), available: true,
    has_activity: now.uses.length + now.repairs.length + now.returns.length > 0,
    current: totalsOf(now), previous: earlier && totalsOf(earlier),
    trend: rangeBuckets(period, unit).map((b, i) => ({ from: b.from, current: trend[i], previous: earlier ? prior[i] ?? null : null })),
    dispositions: DISPOSITIONS.map(([key, label]) => { const list = now.returns.filter((r) => r.disposition === key); return { key, label, count: list.length, value: total(list, (r) => r.total_value) }; }),
    by_item: segments(lines(now), earlier && lines(earlier), 'key', itemFigures, 'pieces_booked', names),
    by_category: segments(now.returns, earlier && earlier.returns, 'category', returnFigures, 'returned_value', CATEGORIES),
    repairs: now.repairs.map(({ id, name, unit_code, event_name, date, quantity, loss, status }) => ({ id, name, unit_code, event_name, date, quantity, cost: loss, status }))
      .sort((a, b) => (a.status === 'resolved') - (b.status === 'resolved') || String(b.date).localeCompare(String(a.date))),
    returns: now.returns.map(({ event, ...r }) => r).sort((a, b) => String(b.event_date).localeCompare(String(a.event_date))),
    register: assets,
  };
}