import { readAll, linked, cateringScope, replyHead, segments, num, round } from './executiveCateringCommon.js';
import { readFilter, filterEvents } from './executiveCateringFilter.js';
import { rangeBuckets } from './executivePeriod.js';

// Cost Variance for the Executive Dashboard: the delivered events (status
// Completed, by event date) of the picker's branches with complete actual
// costs, their planned cost (the quote's cost estimate plus the staffing plan)
// against their actual cost (the latest actual-cost calculation plus active
// cost exceptions) per cost type, as each event's Post-event variance step
// works them out, and the catering production batches made for them, beside
// the comparison period. Every record is read on the server, so totals are
// never cut off.
const TYPES = { food: 'Food & ingredients', labor: 'Labour', equipment: 'Equipment', transport: 'Transport', other: 'Other quoted costs' };
const amount = (v) => num(v) ?? 0;
const total = (rows, f) => round(rows.reduce((s, r) => s + (f(r) || 0), 0));
const lineCost = (l) => (l.line_cost != null ? amount(l.line_cost) : amount(l.quantity) * amount(l.unit_cost));
const pctOver = (actual, planned) => (planned > 0 ? ((actual - planned) / planned) * 100 : null);

// Planned: food from the quote's cost estimate less its lines marked other,
// labour from the staffing plan; equipment and transport have no plan.
function costed(event, quote, exceptions) {
  const other = round((quote?.line_items || []).filter((l) => l.cost_category === 'other').reduce((s, l) => s + lineCost(l), 0));
  const planned = { food: round(amount(quote?.estimated_cost) - other), labor: amount(event.estimated_labor_cost), equipment: 0, transport: 0, other };
  const recorded = { food: amount(event.actual_food_cost), labor: amount(event.actual_labor_cost), equipment: amount(event.actual_equipment_cost), transport: 0, other: 0 };
  const lines = Object.keys(TYPES).map((key) => ({
    key, planned: planned[key], actual: round(recorded[key] + total(exceptions.filter((x) => x.category === key), (x) => amount(x.amount))),
  }));
  const plan = total(lines, (l) => l.planned), actual = total(lines, (l) => l.actual);
  return {
    id: event.id, name: event.event_name || 'Untitled event', date: event.event_date, client: event.client_name || 'No client name',
    event_type: event.event_type || 'Unspecified', package_name: quote?.package_name || 'Manual / Custom',
    guests: amount(event.guaranteed_guests) || amount(event.expected_guests),
    planned: plan, actual, over: round(actual - plan), over_pct: pctOver(actual, plan), lines,
  };
}

async function delivered(ctx, where, range, filter) {
  const E = ctx.svc.entities;
  const events = await filterEvents(ctx, await readAll(E.CateringEvent, { ...where, status: 'completed', event_date: { $gte: range.from, $lte: range.to } }), filter);
  // Incomplete actual costs would understate the actual side, so those events are counted, not compared.
  const complete = events.filter((e) => e.actual_cost_status === 'complete'), ids = complete.map((e) => e.id);
  const [active, accepted, exceptions] = await Promise.all([
    linked(E.CateringQuote, 'id', complete.map((e) => e.active_quote_id).filter(Boolean)),
    linked(E.CateringQuote, 'event_id', ids, { status: 'accepted' }),
    linked(E.CateringCostException, 'event_id', ids, { status: 'active' }),
  ]);
  const quoteOf = new Map(active.map((q) => [q.id, q])), acceptedOf = new Map(accepted.map((q) => [q.event_id, q]));
  const exceptionsOf = exceptions.reduce((m, x) => m.set(x.event_id, [...(m.get(x.event_id) || []), x]), new Map());
  return {
    left_out: events.length - complete.length,
    rows: complete.map((e) => costed(e, quoteOf.get(e.active_quote_id) || acceptedOf.get(e.id) || null, exceptionsOf.get(e.id) || [])),
  };
}

// The completed catering production batches of the events: planned cost
// (batches × the recipe's current batch cost) against the ingredients consumed
// at completion, and output against planned output. A batch whose recipe is
// no longer on file or has no cost is only counted.
async function batches(ctx, rows) {
  const E = ctx.svc.entities;
  const orders = await linked(E.ProductionOrder, 'catering_event_id', rows.map((r) => r.id), { order_source: 'catering', status: 'completed' });
  const recipes = new Map((await linked(E.Recipe, 'id', orders.map((o) => o.recipe_id).filter(Boolean))).map((r) => [r.id, r]));
  const lines = [];
  for (const o of orders) {
    const recipe = recipes.get(o.recipe_id), batchCost = amount(recipe?.total_cost);
    if (!batchCost) continue;
    lines.push({
      recipe: recipe.id, name: recipe.name || o.recipe_name || 'Unnamed recipe', planned: amount(o.target_quantity) * batchCost, actual: amount(o.total_cost),
      planned_output: amount(o.target_quantity) * amount(recipe.output_quantity), actual_output: amount(o.actual_output_quantity),
    });
  }
  return { lines, skipped: orders.length - lines.length };
}

function totalsOf(rows) {
  const planned = total(rows, (r) => r.planned), actual = total(rows, (r) => r.actual);
  return {
    events_compared: rows.length, planned_cost: planned, actual_cost: actual,
    cost_vs_estimate: round(actual - planned), cost_vs_estimate_pct: pctOver(actual, planned),
    // Under half a currency unit is rounding, not an overspend.
    over_estimate_events: rows.filter((r) => r.over > 0.5).length,
  };
}

const typeFigures = (lines) => {
  const planned = total(lines, (l) => l.planned), actual = total(lines, (l) => l.actual);
  return { planned, actual, vs_estimate: round(actual - planned), vs_estimate_pct: pctOver(actual, planned) };
};
const recipeFigures = (lines) => {
  const planned = total(lines, (l) => l.planned), actual = total(lines, (l) => l.actual), output = lines.reduce((s, l) => s + l.planned_output, 0);
  return { batches: lines.length, planned, actual, vs_plan: round(actual - planned), yield_pct: output > 0 ? (lines.reduce((s, l) => s + l.actual_output, 0) / output) * 100 : null };
};
const linesOf = (rows) => rows.flatMap((r) => r.lines);
const used = (s) => [s.current, s.previous].some((f) => f && (f.planned || f.actual));

export async function cateringVariance(ctx, input) {
  const scope = await cateringScope(ctx, input), { unit, period, comparison, where } = scope, filter = readFilter(input);
  if (!scope.isOn('catering')) return { ...replyHead(scope), available: false, reason: 'module_off' };
  const [now, before] = await Promise.all([delivered(ctx, where, period, filter), delivered(ctx, where, comparison, filter)]);
  const rows = now.rows, earlier = before.rows.length ? before.rows : null;
  const [made, madeBefore] = await Promise.all([batches(ctx, rows), earlier ? batches(ctx, earlier) : null]);
  const cells = (list, range) => rangeBuckets(range, unit).map((b) => totalsOf(list.filter((r) => r.date >= b.from && r.date <= b.to)).cost_vs_estimate);
  const trend = cells(rows, period), prior = earlier ? cells(earlier, comparison) : [];
  const group = (key) => segments(rows, earlier, key, totalsOf, 'cost_vs_estimate');
  const recipeNames = Object.fromEntries([...made.lines, ...(madeBefore?.lines || [])].map((l) => [l.recipe, l.name]));
  return {
    ...replyHead(scope), available: true,
    has_activity: rows.length + now.left_out > 0,
    left_out: now.left_out,
    current: totalsOf(rows), previous: earlier && totalsOf(earlier),
    trend: rangeBuckets(period, unit).map((b, i) => ({ from: b.from, current: trend[i], previous: earlier ? prior[i] ?? null : null })),
    by_type: segments(linesOf(rows), earlier && linesOf(earlier), 'key', typeFigures, 'actual', TYPES).filter(used),
    by_event_type: group('event_type'),
    by_package: group('package_name'),
    by_recipe: segments(made.lines, madeBefore?.lines, 'recipe', recipeFigures, 'vs_plan', recipeNames),
    batches_skipped: made.skipped,
    events: rows.map(({ lines, ...r }) => r).sort((a, b) => b.over - a.over),
  };
}