import { readAll, linked, cateringScope, replyHead, segments, num, round } from './executiveCateringCommon.js';
import { readFilter, filterEvents } from './executiveCateringFilter.js';
import { rangeBuckets } from './executivePeriod.js';

// Loss Analysis for the Executive Dashboard: the delivered events (status
// Completed, by event date) of the picker's branches against their target
// margins and the margins expected at quote, from each event's latest
// actual-cost calculation, beside the comparison period. Every record is read
// on the server, so totals are never cut off.
const FACTORS = {
  revenue_variance: 'Revenue', food_cost_variance: 'Food cost', other_cost_variance: 'Other costs',
  labor_cost_variance: 'Labour cost', labor_baseline_alignment: 'Labour not quoted', equipment_cost_variance: 'Equipment loss',
  exception_cost_variance: 'Cost exceptions', client_recovered_equipment_costs: 'Client recoveries',
};
const STATUSES = [['on_target', 'On target'], ['underperforming', 'Below target'], ['loss', 'At a loss'], ['insufficient_data', "Can't be analysed"]];
const BELOW = ['loss', 'underperforming'];
const total = (rows, f) => round(rows.reduce((s, r) => s + (f(r) || 0), 0));

// The records an event with incomplete actual costs still needs, as its walkthrough lists them.
function missingOf(run) {
  const warnings = run?.warning_codes || [], counts = run?.source_counts || {}, out = [];
  if (!Number(counts.slips) || warnings.some((c) => c.startsWith('food_'))) out.push('food');
  if (!Number(counts.attendance) || warnings.some((c) => /labor|attendance|shift|assignment/.test(c))) out.push('labour');
  if (warnings.some((c) => /equipment|damage|replacement/.test(c))) out.push('equipment');
  return out.join(' / ') || 'source';
}

function row(event, run, quote) {
  const status = STATUSES.some(([key]) => key === event.loss_analysis_status) ? event.loss_analysis_status : 'insufficient_data';
  const judged = status !== 'insufficient_data';
  const revenue = num(event.actual_revenue), margin = num(event.actual_margin), target = num(event.applicable_target_margin_percentage);
  return {
    id: event.id, name: event.event_name || 'Untitled event', date: event.event_date, client: event.client_name || 'No client name',
    event_type: event.event_type || 'Unspecified', package_name: quote?.package_name || 'Manual / Custom',
    status, revenue, margin, margin_pct: num(event.actual_margin_percentage), target_pct: target,
    shortfall: BELOW.includes(status) && target !== null && revenue !== null && margin !== null ? Math.max(0, round((target / 100) * revenue - margin)) : 0,
    expected: judged ? num(run?.margin_bridge_expected_margin) : null,
    missing: judged ? null : missingOf(run),
    lines: judged ? (run?.margin_bridge_lines || []).filter((l) => FACTORS[l.key]).map((l) => ({ key: l.key, delta: num(l.delta) ?? 0 })) : [],
  };
}

async function delivered(ctx, where, range, filter) {
  const E = ctx.svc.entities;
  const events = await filterEvents(ctx, await readAll(E.CateringEvent, { ...where, status: 'completed', event_date: { $gte: range.from, $lte: range.to } }), filter);
  const [runs, quotes] = await Promise.all([
    linked(E.CateringActualCostRun, 'id', events.map((e) => e.actual_cost_run_id).filter(Boolean)),
    linked(E.CateringQuote, 'id', events.map((e) => e.active_quote_id).filter(Boolean)),
  ]);
  const runOf = new Map(runs.map((r) => [r.id, r])), quoteOf = new Map(quotes.map((q) => [q.id, q]));
  return events.map((e) => row(e, runOf.get(e.actual_cost_run_id), quoteOf.get(e.active_quote_id)));
}

function totalsOf(rows) {
  const judged = rows.filter((r) => r.status !== 'insufficient_data'), below = judged.filter((r) => BELOW.includes(r.status));
  const quoted = judged.filter((r) => r.expected !== null && r.margin !== null);
  return {
    events_judged: judged.length, below_target_events: below.length,
    loss_events: judged.filter((r) => r.status === 'loss').length,
    below_target_rate: judged.length ? (below.length / judged.length) * 100 : null,
    margin_shortfall: total(below, (r) => r.shortfall),
    margin_vs_quote: quoted.length ? total(quoted, (r) => r.margin - r.expected) : null,
    insufficient_events: rows.length - judged.length,
  };
}

// The margin expected at quote, each factor of the stored margin bridge, then
// the actual margin, added up across the events with a complete bridge.
function bridge(rows) {
  const used = rows.filter((r) => r.expected !== null && r.margin !== null && r.lines.length);
  const steps = Object.entries(FACTORS)
    .map(([key, label]) => ({ key, label, value: total(used, (r) => r.lines.find((l) => l.key === key)?.delta) }))
    .filter((s) => s.value !== 0);
  const expected = total(used, (r) => r.expected), actual = total(used, (r) => r.margin);
  const rest = round(actual - expected - steps.reduce((s, x) => s + x.value, 0));
  return { events: used.length, expected, actual, steps: Math.abs(rest) >= 1 ? [...steps, { key: 'unexplained', label: 'Not explained', value: rest }] : steps };
}

const factorFigures = (lines) => {
  // Under half a currency unit is rounding, not a hit to margin.
  const hurt = lines.filter((l) => l.delta < -0.5);
  return { events_hurt: hurt.length, margin_lost: Math.abs(total(hurt, (l) => l.delta)), net_impact: total(lines, (l) => l.delta) };
};
const linesOf = (rows) => rows.flatMap((r) => r.lines);
const moved = (s) => [s.current, s.previous].some((f) => f && (f.events_hurt || f.net_impact));

export async function cateringLoss(ctx, input) {
  const scope = await cateringScope(ctx, input), { unit, period, comparison, where } = scope, filter = readFilter(input);
  if (!scope.isOn('catering')) return { ...replyHead(scope), available: false, reason: 'module_off' };
  const [rows, before] = await Promise.all([delivered(ctx, where, period, filter), delivered(ctx, where, comparison, filter)]);
  const earlier = before.length ? before : null;
  const cells = (list, range) => rangeBuckets(range, unit).map((b) => totalsOf(list.filter((r) => r.date >= b.from && r.date <= b.to)).margin_shortfall);
  const now = cells(rows, period), prior = earlier ? cells(earlier, comparison) : [];
  const group = (key) => segments(rows, earlier, key, totalsOf, 'margin_shortfall');
  return {
    ...replyHead(scope), available: true,
    has_activity: rows.length > 0,
    current: totalsOf(rows), previous: earlier && totalsOf(earlier),
    trend: rangeBuckets(period, unit).map((b, i) => ({ from: b.from, current: now[i], previous: earlier ? prior[i] ?? null : null })),
    statuses: STATUSES.map(([key, label]) => { const list = rows.filter((r) => r.status === key); return { key, label, count: list.length, value: total(list, (r) => r.revenue) }; }),
    bridge: bridge(rows),
    factors: segments(linesOf(rows), earlier && linesOf(earlier), 'key', factorFigures, 'margin_lost', FACTORS).filter(moved),
    by_package: group('package_name'),
    by_event_type: group('event_type'),
    events: rows.map(({ lines, expected, revenue, margin, ...r }) => r).sort((a, b) => String(b.date).localeCompare(String(a.date))),
  };
}