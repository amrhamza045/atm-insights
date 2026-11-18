import { readAll } from './executiveCateringCommon.js';

// The production batches still open on the Head Chef board today (not
// finished or cancelled) for the picker's branches, by stage, overdue first
// (past their needed-by date), then by the day each is needed.
const STAGES = [['queued', 'Queued'], ['prepping', 'Prepping'], ['cooking', 'Cooking'], ['ready', 'Ready'], ['handed_off', 'Handed off']];
const KEYS = STAGES.map(([key]) => key);

export async function openBatches(ctx, where, today) {
  const list = await readAll(ctx.svc.entities.ProductionOrder, { ...where, status: { $in: ['pending', 'in_progress'] } });
  const rows = list.map((o) => ({
    id: o.id, name: o.recipe_name || 'Unnamed recipe', branch: o.branch_name || '',
    purpose: o.order_source === 'catering' ? o.catering_event_name || 'Catering event' : 'Regular prep',
    stage: KEYS.includes(o.prep_stage) ? o.prep_stage : 'queued', due: o.needed_by_date || '',
    overdue: !!o.needed_by_date && o.needed_by_date < today,
  })).sort((a, b) => (b.overdue - a.overdue) || (a.due || '9999').localeCompare(b.due || '9999'));
  return {
    count: rows.length, overdue: rows.filter((r) => r.overdue).length,
    stages: STAGES.map(([key, label]) => ({ key, label, count: rows.filter((r) => r.stage === key).length })),
    rows: rows.slice(0, 100),
  };
}