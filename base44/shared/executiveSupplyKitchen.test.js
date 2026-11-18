import test from 'node:test';
import assert from 'node:assert/strict';

// The reports run on the backend runtime; outside it no secret is set.
globalThis.Deno ??= { env: { get: () => '' } };
const { default: fixture } = await import('./executiveLedgerFixture.js');
const { supplyKitchen } = await import('./executiveSupplyKitchen.js');

const at = (day, time) => `${day}T${time}.000Z`;
const plusDays = (day, n) => { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const query = { period: 'mtd', compare: 'previous', branch_ids: [] };

// This month Downtown finishes three batches: two runs of sauce for catering,
// on time, in four hours, giving 18 of the recipe's 20 kg; a regular sauce
// clicked through in seconds a month late; and a stew whose recipe was deleted.
// The same days last month it finished one batch on time. Two batches are open.
function seeded(options) {
  const f = fixture(options), { entities: e, dates } = f;
  e.Recipe.rows.push({ id: 'r1', name: 'Sauce', output_quantity: 10, output_unit: 'kg', total_cost: 100 });
  const batch = (id, extra) => e.ProductionOrder.rows.push({ id, branch_id: 'b1', status: 'completed', recipe_id: 'r1', recipe_name: 'Sauce', output_unit: 'kg', target_quantity: 1, ...extra });
  batch('p1', { order_source: 'catering', target_quantity: 2, actual_output_quantity: 18, total_cost: 220, started_date: at(dates.from, '08:00:00'), completed_date: at(dates.from, '12:00:00'), needed_by_date: dates.from, assigned_staff: [{ employee_id: 'e1', name: 'Ashraf' }] });
  batch('p2', { order_source: 'regular', actual_output_quantity: 10, total_cost: 100, started_date: at(dates.from, '13:00:00'), completed_date: at(dates.from, '13:00:30'), needed_by_date: dates.previous, assigned_staff: [{ employee_id: 'e1', name: 'Ashraf' }, { employee_id: 'e2', name: 'Gamal' }] });
  batch('p3', { recipe_id: 'gone', recipe_name: 'Old stew', actual_output_quantity: 5, total_cost: 50, completed_date: at(dates.from, '15:00:00') });
  batch('p0', { actual_output_quantity: 10, total_cost: 80, started_date: at(dates.previous, '08:00:00'), completed_date: at(dates.previous, '10:00:00'), needed_by_date: dates.previous });
  e.ProductionOrder.rows.push(
    { id: 'o1', branch_id: 'b1', status: 'pending', prep_stage: 'queued', recipe_name: 'Sauce', needed_by_date: dates.previous },
    { id: 'o2', branch_id: 'b2', status: 'in_progress', prep_stage: 'cooking', recipe_name: 'Rice', needed_by_date: plusDays(dates.today, 5), order_source: 'catering', catering_event_name: 'Wedding' },
  );
  return f;
}

test('kitchen performance counts every finished batch, on time by its needed-by date, leaving clicked-through batches out of prep time', async () => {
  const r = await supplyKitchen(seeded().ctx, query);
  assert.equal(r.available, true);
  assert.deepEqual(r.current, { kitchen_batches: 3, kitchen_on_time_rate: 50, kitchen_prep_hours: 4, kitchen_yield_pct: 95, kitchen_cost: 370, kitchen_over_recipe: 20, kitchen_catering_share: 33.33, kitchen_overdue: 1 });
  assert.deepEqual([r.previous.kitchen_batches, r.previous.kitchen_on_time_rate], [1, 100]);
  assert.deepEqual([r.unclocked, r.no_recipe, r.unassigned], [2, 1, 1]);
  assert.deepEqual(r.purposes.map((p) => [p.key, p.count, p.value]), [['catering', 1, 220], ['regular', 2, 150]]);
});

test('kitchen tables split the batches by recipe and by the people assigned, and list open batches overdue first', async () => {
  const r = await supplyKitchen(seeded().ctx, query);
  assert.deepEqual(r.by_recipe.map((x) => [x.id, x.batches, x.output, x.yield_pct, x.cost, x.over_recipe]), [['r1', 2, 28, 95, 320, 20], ['gone', 1, 5, null, 50, null]]);
  assert.deepEqual(r.by_chef.map((x) => [x.name, x.batches, x.on_time_rate, x.prep_hours]), [['Ashraf', 2, 50, 4], ['Gamal', 1, 0, null]]);
  assert.deepEqual(r.open.rows.map((x) => [x.id, x.overdue]), [['o1', true], ['o2', false]]);
  assert.deepEqual(r.open.stages.filter((s) => s.count).map((s) => s.key), ['queued', 'cooking']);
});

test('the ledger check says inventory accounting is off, and once it is on compares batch cost with the production posted', async () => {
  const off = await supplyKitchen(seeded().ctx, query);
  assert.deepEqual(off.ledger, { available: false, reason: 'inventory_off', company: 'Rosemary' });
  const f = seeded();
  f.entities.FinanceCompany.rows[0].module_policy = { inventory: { enabled: true, from: f.dates.from } };
  f.entities.InventoryAccountingMovement.rows.push(
    { company_id: 'c', branch_id: 'b1', kind: 'production', entry_date: f.dates.from, amount: 220, journal_id: 'j1' },
    { company_id: 'c', branch_id: 'b1', kind: 'production', entry_date: f.dates.from, amount: 100 },
  );
  const on = await supplyKitchen(f.ctx, query);
  assert.deepEqual(on.ledger, { available: true, company: 'Rosemary', since: null, operational: 370, balance: 220 });
});

test('kitchen performance closes with the manufacturing module', async () => {
  const r = await supplyKitchen(seeded({ disabled: ['manufacturing'] }).ctx, query);
  assert.deepEqual([r.available, r.reason], [false, 'module_off']);
});