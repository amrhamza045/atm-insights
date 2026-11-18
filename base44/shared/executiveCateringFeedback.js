import { readAll, linked, cateringScope, replyHead, segments, num, round } from './executiveCateringCommon.js';
import { readFilter, filterEvents } from './executiveCateringFilter.js';
import { rangeBuckets } from './executivePeriod.js';

// Client Feedback for the Executive Dashboard: the delivered events (status
// Completed, by event date) of the picker's branches and the 1–5 rating and
// comment each client gave at the event wrap-up, beside the comparison period.
// Every record is read on the server, so totals are never cut off. Comments
// are a client's own words about one event, so they only go to people who may
// open catering events themselves.
const STARS = [5, 4, 3, 2, 1];
const share = (part, whole) => (whole > 0 ? (part / whole) * 100 : null);
const average = (list) => (list.length ? list.reduce((s, v) => s + v, 0) / list.length : null);

function row(event, wrap, quote) {
  const rating = num(wrap?.client_rating);
  return {
    id: event.id, name: event.event_name || 'Untitled event', date: event.event_date, client: event.client_name || 'No client name',
    event_type: event.event_type || 'Unspecified', package_name: quote?.package_name || 'Manual / Custom', venue: event.venue_name || 'Venue not set',
    rating: rating >= 1 && rating <= 5 ? rating : null, comment: String(wrap?.client_feedback || '').trim(),
    revenue: num(event.actual_revenue) ?? num(wrap?.final_billing_total) ?? 0,
  };
}

async function delivered(ctx, where, range, filter) {
  const E = ctx.svc.entities;
  const events = await filterEvents(ctx, await readAll(E.CateringEvent, { ...where, status: 'completed', event_date: { $gte: range.from, $lte: range.to } }), filter);
  const [wraps, quotes] = await Promise.all([
    linked(E.CateringReconciliation, 'event_id', events.map((e) => e.id)),
    linked(E.CateringQuote, 'id', events.map((e) => e.active_quote_id).filter(Boolean)),
  ]);
  // Each event's finalized wrap-up, else its latest one.
  const wrapOf = new Map();
  for (const w of wraps.sort((a, b) => (a.status === 'finalized') - (b.status === 'finalized') || String(a.updated_date).localeCompare(String(b.updated_date)))) wrapOf.set(w.event_id, w);
  const quoteOf = new Map(quotes.map((q) => [q.id, q]));
  return events.map((e) => row(e, wrapOf.get(e.id), quoteOf.get(e.active_quote_id)));
}

function totalsOf(rows) {
  const rated = rows.filter((r) => r.rating !== null);
  return {
    client_rating: average(rated.map((r) => r.rating)), rated_events: rated.length,
    rating_coverage: share(rated.length, rows.length), happy_share: share(rated.filter((r) => r.rating >= 4).length, rated.length),
    low_ratings: rated.filter((r) => r.rating <= 2).length,
  };
}

export async function cateringFeedback(ctx, input) {
  const scope = await cateringScope(ctx, input), { unit, period, comparison, where } = scope, filter = readFilter(input);
  if (!scope.isOn('catering')) return { ...replyHead(scope), available: false, reason: 'module_off' };
  const [rows, before] = await Promise.all([delivered(ctx, where, period, filter), delivered(ctx, where, comparison, filter)]);
  const earlier = before.length ? before : null;
  const cells = (list, range) => rangeBuckets(range, unit).map((b) => totalsOf(list.filter((r) => r.date >= b.from && r.date <= b.to)).client_rating);
  const now = cells(rows, period), prior = earlier ? cells(earlier, comparison) : [];
  const group = (key) => segments(rows, earlier, key, totalsOf, 'rated_events');
  const mayRead = ctx.admin || !!ctx.permissions.catering_view;
  return {
    ...replyHead(scope), available: true,
    has_activity: rows.length > 0,
    current: totalsOf(rows), previous: earlier && totalsOf(earlier),
    trend: rangeBuckets(period, unit).map((b, i) => ({ from: b.from, current: now[i], previous: earlier ? prior[i] ?? null : null })),
    ratings: STARS.map((n) => {
      const list = rows.filter((r) => r.rating !== null && Math.round(r.rating) === n);
      return { key: `r${n}`, label: n === 1 ? '1 star' : `${n} stars`, count: list.length, value: round(list.reduce((s, r) => s + r.revenue, 0)) };
    }),
    by_package: group('package_name'),
    by_event_type: group('event_type'),
    by_venue: group('venue'),
    comments: mayRead
      ? rows.filter((r) => r.comment).map(({ revenue, ...r }) => r).sort((a, b) => (a.rating ?? 6) - (b.rating ?? 6) || String(b.date).localeCompare(String(a.date)))
      : null,
  };
}