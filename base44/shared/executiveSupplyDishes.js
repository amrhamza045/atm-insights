import { readAll, linked, cateringScope, replyHead, segments, num, round } from './executiveCateringCommon.js';
import { loadConversionRules, computeIngredientCost } from './unitConversion.js';
import { within, amount, sum, pct, trendOf, partsOf } from './executiveSupplyCommon.js';

// Dish Performance for the Executive Dashboard. In the period, beside the
// comparison: the menu dishes on the active quotes of the delivered catering
// events (status Completed, by event date) of the picker's branches — what
// each brought in and cost as quoted, how often it was chosen, its place in
// the menu-engineering matrix, and what the same portions would cost at
// today's recipe costs. As of today: every available priced dish of the menu
// at today's recipe cost against its price and target margin.
const CLASSES = [['star', 'Stars'], ['plowhorse', 'Plowhorses'], ['puzzle', 'Puzzles'], ['dog', 'Dogs']];
const per4 = (v) => Math.round((v + Number.EPSILON) * 10000) / 10000;

async function served(ctx, where, range) {
  const E = ctx.svc.entities;
  const events = await readAll(E.CateringEvent, { ...where, status: 'completed', event_date: within(range) });
  const dateOf = new Map(events.map((e) => [e.id, e.event_date]));
  const quotes = (await linked(E.CateringQuote, 'id', events.map((e) => e.active_quote_id).filter(Boolean))).filter((q) => dateOf.has(q.event_id));
  const lines = quotes.flatMap((q) => (q.line_items || []).filter((l) => l.menu_item_id).map((l) => ({
    key: l.menu_item_id, name: l.name || 'Unnamed dish', event: q.event_id, date: dateOf.get(q.event_id), quantity: amount(l.quantity),
    revenue: num(l.line_total) ?? round(amount(l.quantity) * amount(l.unit_price) - amount(l.discount_amount)),
    cost: num(l.line_cost) ?? round(amount(l.quantity) * amount(l.unit_cost)),
  })));
  return { events: events.length, quoted: quotes.length, lines };
}

// Today's cost of one unit of each dish with a recipe: its ingredients at the
// stock items' current costs; null while any ingredient can't be costed.
async function recipeCosts(ctx, dishes) {
  const ids = dishes.flatMap((d) => (d.recipe || []).map((r) => r.inventory_item_id)).filter(Boolean);
  const [items, rules] = await Promise.all([linked(ctx.svc.entities.InventoryItem, 'id', ids), loadConversionRules(ctx.svc.entities)]);
  const itemOf = new Map(items.map((i) => [i.id, i]));
  return new Map(dishes.filter((d) => (d.recipe || []).length).map((d) => {
    const costs = d.recipe.map((r) => computeIngredientCost(r.quantity_needed, r.unit, itemOf.get(r.inventory_item_id), rules));
    return [d.id, costs.every((c) => c.ok) ? per4(costs.reduce((s, c) => s + c.totalCost, 0)) : null];
  }));
}

const dishFigures = (lines) => {
  const revenue = sum(lines, (l) => l.revenue), cost = sum(lines, (l) => l.cost);
  return { events: new Set(lines.map((l) => l.event)).size, revenue, cost, margin: round(revenue - cost), margin_pct: pct(revenue - cost, revenue) };
};
const totalsOf = (lines) => {
  const f = dishFigures(lines);
  return { dishes_served: new Set(lines.map((l) => l.key)).size, dish_revenue: f.revenue, dish_margin: f.margin, dish_margin_pct: f.margin_pct };
};

// Menu engineering: popular when chosen for at least 70% of the average number
// of events per dish, profitable when its margin % is at least that of all the
// period's dishes together. drift: today's recipe cost of its portions less
// their cost as quoted (null without a costed recipe).
function engineered(rows, lines, unitCost, overall) {
  const own = rows.filter((r) => r.current.events > 0);
  const usual = own.reduce((s, r) => s + r.current.events, 0) / (own.length || 1);
  return own.map((r) => {
    const mine = lines.filter((l) => l.key === r.key), cost = unitCost.get(r.key);
    const popular = r.current.events >= 0.7 * usual, profitable = r.current.margin_pct !== null && r.current.margin_pct >= (overall ?? 0);
    return {
      ...r, class: popular ? (profitable ? 'star' : 'plowhorse') : profitable ? 'puzzle' : 'dog',
      drift: cost == null ? null : round(sum(mine, (l) => l.quantity * cost) - sum(mine, (l) => l.cost)),
    };
  });
}

// The available priced dishes of the picked branches (or shared by all) with today's food cost.
function menuToday(dishes, unitCost, branches) {
  const listed = dishes.filter((d) => d.available !== false && amount(d.price) > 0 && (!branches.length || !d.branch_id || branches.includes(d.branch_id)));
  const costed = listed.filter((d) => unitCost.get(d.id) != null).map((d) => {
    const cost = unitCost.get(d.id), price = amount(d.price), food = pct(cost, price), target = amount(d.target_margin_percentage) || null;
    return { id: d.id, name: d.name || 'Unnamed dish', category: d.category || '', branch: d.branch_name || '', price: round(price), cost: round(cost), food_cost_pct: food, target, below_target: target !== null && 100 - food < target };
  }).sort((a, b) => b.food_cost_pct - a.food_cost_pct);
  return { costed, without_recipe: listed.filter((d) => !(d.recipe || []).length).length };
}

export async function supplyDishes(ctx, input) {
  const scope = await cateringScope(ctx, input), { period, comparison, where } = scope;
  if (!scope.isOn('menu_profitability')) return { ...replyHead(scope), available: false, reason: 'module_off' };
  const [now, before, dishes] = await Promise.all([served(ctx, where, period), served(ctx, where, comparison), readAll(ctx.svc.entities.MenuItem, {})]);
  const unitCost = await recipeCosts(ctx, dishes);
  const earlier = before.lines.length ? before.lines : null;
  const current = totalsOf(now.lines);
  const names = Object.fromEntries([...now.lines, ...(earlier || [])].map((l) => [l.key, l.name]));
  const rows = engineered(segments(now.lines, earlier, 'key', dishFigures, 'revenue', names), now.lines, unitCost, current.dish_margin_pct);
  const menu = menuToday(dishes, unitCost, where.branch_id?.$in || []);
  return {
    ...replyHead(scope), available: true, has_activity: now.lines.length > 0,
    events: now.events, quoted: now.quoted, uncosted_dishes: rows.filter((r) => r.drift === null).length,
    current: {
      ...current, cost_drift: rows.some((r) => r.drift !== null) ? sum(rows, (r) => r.drift) : null,
      menu_food_cost_pct: menu.costed.length ? round(menu.costed.reduce((s, d) => s + d.food_cost_pct, 0) / menu.costed.length) : null,
      menu_below_target: menu.costed.filter((d) => d.below_target).length, menu_without_recipe: menu.without_recipe,
    },
    previous: earlier && totalsOf(earlier),
    trend: trendOf(scope, now.lines, earlier, (l) => l.date, (l) => l.revenue),
    classes: partsOf(rows, CLASSES, (r) => r.class, (r) => r.current.revenue).map((p) => ({ ...p, dishes: rows.filter((r) => r.class === p.key).slice(0, 3).map((r) => r.label) })),
    dishes: rows.slice(0, 200),
    menu: menu.costed.slice(0, 200),
  };
}