import { linked } from './executiveCateringCommon.js';

// The Executive Dashboard's catering filter bar: the venue type (on-site or
// off-site) and venues, then whole event types (package categories) or single
// packages. The catering reports narrow their events with it on the server, so
// every total follows the bar. As in the bar, an event without a venue type is
// on-site and its package comes from its active quote.
const names = (v) => (Array.isArray(v) ? v.filter((s) => typeof s === 'string' && s).slice(0, 200) : []);
const UNCATEGORIZED = 'Uncategorized', MANUAL = 'Manual / Custom';

export function readFilter(input) {
  const f = input?.filter || {};
  const location = f.location_type === 'on_site' || f.location_type === 'off_site' ? f.location_type : null;
  return { location, venues: names(f.venue_names), categories: names(f.categories), packages: names(f.packages) };
}

export async function filterEvents(ctx, events, f) {
  const kept = events.filter((e) => (!f.location || (e.location_type || 'on_site') === f.location) && (!f.venues.length || f.venues.includes(e.venue_name)));
  if (!f.categories.length && !f.packages.length) return kept;
  const quotes = new Map((await linked(ctx.svc.entities.CateringQuote, 'id', kept.map((e) => e.active_quote_id).filter(Boolean))).map((q) => [q.id, q]));
  return kept.filter((e) => {
    const q = quotes.get(e.active_quote_id);
    return f.categories.includes(q?.package_category || UNCATEGORIZED) || f.packages.includes(q?.package_name || MANUAL);
  });
}