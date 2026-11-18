import { readAll, linked, cateringScope, replyHead, round } from './executiveCateringCommon.js';
import { dayInOffset } from './companyTimezone.js';
import { amount, sum, pct, trendOf, partsOf } from './executiveSupplyCommon.js';
import { postedProduction } from './executiveSupplyLedger.js';
import { openBatches } from './executiveKitchenBoard.js';

// Kitchen Performance for the Executive Dashboard: the production batches of
// the Head Chef board that the picker's branches finished in the period (by the
// company day each was completed), beside the comparison's. On time: finished
// on or before the batch's needed-by date (the event date for catering
// batches). Prep time runs from Start to Finish; a batch started and finished
// within a minute, or never started, was clicked through after the work, so it
// counts everywhere but in prep time. Yield and cost against the recipe use the
// batch's recipe as it is today; a batch whose recipe no longer exists counts
// everywhere but there. As of today: the batches still open, by stage. Beside
// the batch cost: the production cost posted to the ledger. Every record is
// read on the server, so totals are never cut off.
const PURPOSES = [['catering', 'For catering events'], ['regular', 'Regular prep']];

const avg = (values) => (values.length ? round(values.reduce((s, v) => s + v, 0) / values.length) : null);
const known = (list, f) => list.map(f).filter((v) => v !== null);
const groupOf = (list, keyOf) => list.reduce((m, b) => m.set(keyOf(b), [...(m.get(keyOf(b)) || []), b]), new Map());
const onTimeRate = (list) => {
  const dated = list.filter((b) => b.on_time !== null);
  return pct(dated.filter((b) => b.on_time).length, dated.length);
};

function batchOf(o, offset, recipes) {
  const recipe = recipes.get(o.recipe_id), runs = amount(o.target_quantity) || 1, cost = amount(o.total_cost);
  const day = dayInOffset(o.completed_date, offset), due = o.needed_by_date || '';
  const minutes = o.started_date ? (Date.parse(o.completed_date) - Date.parse(o.started_date)) / 60000 : null;
  const recipeOutput = amount(recipe?.output_quantity) * runs, recipeCost = amount(recipe?.total_cost) * runs;
  return {
    day, branch_id: o.branch_id || '', key: o.recipe_id || o.recipe_name || 'unknown',
    name: recipe?.name || o.recipe_name || 'Unnamed recipe', unit: o.output_unit || recipe?.output_unit || '',
    purpose: o.order_source === 'catering' ? 'catering' : 'regular', cost: round(cost), output: amount(o.actual_output_quantity),
    yield_pct: recipeOutput > 0 ? (amount(o.actual_output_quantity) / recipeOutput) * 100 : null,
    over_recipe: recipeCost > 0 ? cost - recipeCost : null,
    on_time: due ? day <= due : null,
    prep_hours: minutes !== null && minutes >= 1 ? minutes / 60 : null,
    staff: (o.assigned_staff || []).filter((s) => s.employee_id || s.name),
    has_recipe: !!recipe,
  };
}

const overRecipe = (list) => { const costed = list.filter((b) => b.over_recipe !== null); return costed.length ? sum(costed, (b) => b.over_recipe) : null; };

const figures = (list) => ({
  kitchen_batches: list.length,
  kitchen_on_time_rate: onTimeRate(list),
  kitchen_prep_hours: avg(known(list, (b) => b.prep_hours)),
  kitchen_yield_pct: avg(known(list, (b) => b.yield_pct)),
  kitchen_cost: sum(list, (b) => b.cost),
  kitchen_over_recipe: overRecipe(list),
  kitchen_catering_share: pct(list.filter((b) => b.purpose === 'catering').length, list.length),
});

const byRecipe = (list) => [...groupOf(list, (b) => b.key)].map(([id, rows]) => ({
  id, name: rows[0].name, unit: rows[0].unit, batches: rows.length, output: sum(rows, (b) => b.output),
  yield_pct: avg(known(rows, (b) => b.yield_pct)), cost: sum(rows, (b) => b.cost), over_recipe: overRecipe(rows),
})).sort((a, b) => b.cost - a.cost);

// Each person the Head Chef assigned, with every batch they were on.
function byChef(list) {
  const people = new Map();
  for (const b of list) for (const s of b.staff) {
    const id = s.employee_id || s.name, person = people.get(id) || { id, name: s.name || 'Unnamed', rows: [] };
    person.rows.push(b);
    people.set(id, person);
  }
  return [...people.values()]
    .map((p) => ({ id: p.id, name: p.name, batches: p.rows.length, on_time_rate: onTimeRate(p.rows), prep_hours: avg(known(p.rows, (b) => b.prep_hours)) }))
    .sort((a, b) => b.batches - a.batches);
}

const finished = (ctx, where, stamps) => readAll(ctx.svc.entities.ProductionOrder, { ...where, status: 'completed', completed_date: stamps });

export async function supplyKitchen(ctx, input) {
  const scope = await cateringScope(ctx, input), { where, stamps, offset, today } = scope;
  if (!scope.isOn('manufacturing')) return { ...replyHead(scope), available: false, reason: 'module_off' };
  const [nowRows, beforeRows, open] = await Promise.all([finished(ctx, where, stamps.current), finished(ctx, where, stamps.comparison), openBatches(ctx, where, today)]);
  const used = [...nowRows, ...beforeRows].map((o) => o.recipe_id).filter(Boolean);
  const recipes = new Map((await linked(ctx.svc.entities.Recipe, 'id', used)).map((r) => [r.id, r]));
  const now = nowRows.map((o) => batchOf(o, offset, recipes)), before = beforeRows.map((o) => batchOf(o, offset, recipes));
  // Without batches in the comparison period there's nothing to compare with.
  const earlier = before.length ? before : null;
  return {
    ...replyHead(scope), available: true, has_activity: now.length > 0,
    current: { ...figures(now), kitchen_overdue: open.overdue }, previous: earlier && figures(earlier),
    unclocked: now.filter((b) => b.prep_hours === null).length,
    no_recipe: now.filter((b) => !b.has_recipe).length,
    unassigned: now.filter((b) => !b.staff.length).length,
    trend: trendOf(scope, now, earlier, (b) => b.day, () => 1),
    on_time_trend: trendOf(scope, now, earlier, (b) => b.day, null, onTimeRate),
    purposes: partsOf(now, PURPOSES, (b) => b.purpose, (b) => b.cost),
    by_recipe: byRecipe(now), by_chef: byChef(now), open,
    ledger: await postedProduction(ctx, scope, now),
  };
}