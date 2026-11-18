import { moduleSwitches, reportBranches } from './executiveAccess.js';
import { resolvePeriod } from './executivePeriod.js';
import { pickCompany } from './executiveCompany.js';

// What the Executive Dashboard catering reports share: every matching record
// read page by page (so totals are never cut off), the scope a report starts
// from, and figures grouped beside the comparison's.
export const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
export const round = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

export async function readAll(entity, query) {
  const rows = [];
  let cursor = null;
  do {
    const page = await entity.filter(query, { sort: 'id', limit: 200, ...(cursor ? { cursor } : {}) });
    rows.push(...page.items);
    if (rows.length > 20000) throw Object.assign(new Error('Too many records to total. Pick a shorter period.'), { status: 400 });
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return rows;
}

// Records whose field is one of ids: 100 ids per query, six queries at a time.
export async function linked(entity, field, ids, query = {}) {
  const unique = [...new Set(ids)], rows = [];
  for (let i = 0; i < unique.length; i += 600) {
    const batch = [];
    for (let j = i; j < Math.min(i + 600, unique.length); j += 100) batch.push(readAll(entity, { ...query, [field]: { $in: unique.slice(j, j + 100) } }));
    rows.push(...(await Promise.all(batch)).flat());
  }
  return rows;
}

// Dates, module switches, the picked branches and the currency of the picked
// Finance company (none until Finance has one). Catering has no budget, so a
// budget comparison reads as the previous period.
export async function cateringScope(ctx, input) {
  const compare = input.compare === 'budget' ? 'previous' : input.compare;
  const [dates, isOn, company] = await Promise.all([
    resolvePeriod(ctx.svc.entities, { ...input, compare }), moduleSwitches(ctx), pickCompany(ctx.svc, input),
  ]);
  const branches = reportBranches(ctx, input.branch_ids);
  return { ...dates, isOn, where: branches.length ? { branch_id: { $in: branches } } : {}, currency: company?.currency || null, company };
}

// How every catering reply opens: its dates and currency.
export const replyHead = (scope) => ({ ready: true, today: scope.today, unit: scope.unit, period: scope.period, comparison: scope.comparison, currency: scope.currency });

// rows grouped by key, each group's figures beside the comparison's (earlier is
// null when there is no comparison), largest first by sortBy.
export function segments(rows, earlier, key, figures, sortBy, labels = {}) {
  const split = (list) => list.reduce((m, r) => m.set(r[key], [...(m.get(r[key]) || []), r]), new Map());
  const now = split(rows), before = split(earlier || []);
  return [...new Set([...now.keys(), ...before.keys()])]
    .map((k) => ({ key: k, label: labels[k] || k, current: figures(now.get(k) || []), previous: earlier ? figures(before.get(k) || []) : null }))
    .sort((a, b) => (b.current[sortBy] ?? 0) - (a.current[sortBy] ?? 0));
}