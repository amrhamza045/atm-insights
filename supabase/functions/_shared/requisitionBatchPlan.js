import { roundMoney } from './cateringActualCostCommon.js';

/**
 * Batch plan rules (pure, no writes). A plan is a list of batches:
 *   { batch_number, slip_id (existing batch slip, or null = new batch), slip_number, needed_by_date, lines: [{ line_id, inventory_item_name, unit, quantity }] }
 */
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_BATCHES = 20;

/** Lines a batch plan covers: active, agreed, agreed quantity above 0 (declined lines excluded). */
export const plannableLines = (lines) =>
  lines.filter((l) => l.is_active !== false && l.is_agreed === true && Number(l.agreed_quantity) > 0);

/** Batch slip statuses that issued stock: locked, never part of a proposal again. */
export const RELEASED_STATUSES = ['released', 'received'];
export const isReleased = (slip) => RELEASED_STATUSES.includes(slip?.status);

/** Per line: the batch quantity already placed on released batches (that part of the line is done). */
export function releasedByLine(slips) {
  const done = new Map();
  for (const s of slips.filter(isReleased))
    for (const x of s.lines || [])
      if (x.requisition_line_id) done.set(x.requisition_line_id, roundMoney((done.get(x.requisition_line_id) || 0) + (Number(x.quantity_reserved) || 0)));
  return done;
}

/** Quantity of a line the plan must place: agreed minus what released batches already took. */
export const remainingOf = (line, released) => roundMoney((Number(line.agreed_quantity) || 0) - (released?.get(line.id) || 0));

/** The plan in force, read from the requisition's non-void batch slips. */
export const planOfSlips = (slips) => slips.map((s) => ({
  batch_number: s.batch_number ?? null, slip_id: s.id, slip_number: s.slip_number || '', needed_by_date: s.needed_by_date || '',
  lines: (s.lines || []).map((l) => ({
    line_id: l.requisition_line_id || '', inventory_item_name: l.inventory_item_name || '', unit: l.unit || '', quantity: Number(l.quantity_reserved) || 0,
  })),
}));

/** Client input → a plan: names from the lines, zero quantities dropped (a line not in that batch), numbers rounded. */
export function normalizePlan(input, linesById, slipsById) {
  return (Array.isArray(input) ? input : []).map((b) => {
    const slip = b?.slip_id ? slipsById.get(b.slip_id) : null;
    return {
      batch_number: slip?.batch_number ?? null, slip_id: b?.slip_id || null, slip_number: slip?.slip_number || '',
      needed_by_date: String(b?.needed_by_date || ''),
      lines: (Array.isArray(b?.lines) ? b.lines : []).filter((x) => Number(x?.quantity) !== 0).map((x) => {
        const line = linesById.get(x?.line_id);
        return { line_id: String(x?.line_id || ''), inventory_item_name: line?.inventory_item_name || '', unit: line?.unit || '', quantity: roundMoney(Number(x?.quantity)) };
      }),
    };
  });
}

/**
 * Every problem with a plan (empty = valid):
 *  - per line, the batch quantities add up exactly to its remaining agreed quantity (agreed − released batches);
 *  - released batches are locked: they can't appear in a plan;
 *  - every batch has at least one line with a quantity above 0;
 *  - every date is today or later (company day) and not after the event date;
 *  - existing batches belong to this requisition and appear once.
 */
export function planProblems(plan, lines, slipsById, { today, eventDate, released = new Map(), lockedSlipIds = new Set() }) {
  const problems = [];
  const linesById = new Map(lines.map((l) => [l.id, l]));
  if (!plan.length) problems.push('The plan needs at least one batch');
  if (plan.length > MAX_BATCHES) problems.push(`A plan can have at most ${MAX_BATCHES} batches`);
  const seenSlips = new Set();
  const totals = new Map();
  plan.forEach((b, i) => {
    const name = `Batch ${i + 1}`;
    if (b.slip_id) {
      if (lockedSlipIds.has(b.slip_id)) problems.push(`${name}: this batch is already released and can't be changed`);
      else if (!slipsById.has(b.slip_id)) problems.push(`${name}: not a current batch of this requisition`);
      else if (seenSlips.has(b.slip_id)) problems.push(`${name}: the same batch is listed twice`);
      seenSlips.add(b.slip_id);
    }
    if (!DATE.test(b.needed_by_date)) problems.push(`${name}: a date is required`);
    else {
      if (b.needed_by_date < today) problems.push(`${name}: ${b.needed_by_date} is in the past`);
      if (eventDate && b.needed_by_date > eventDate) problems.push(`${name}: ${b.needed_by_date} is after the event date (${eventDate})`);
    }
    if (!b.lines.length) problems.push(`${name}: a batch needs at least one line with a quantity above 0`);
    const inBatch = new Set();
    for (const x of b.lines) {
      const line = linesById.get(x.line_id);
      if (!line) { problems.push(`${name}: line ${x.line_id || '—'} is not an agreed line of this requisition`); continue; }
      if (!(x.quantity > 0)) problems.push(`${name}: ${line.inventory_item_name}: the quantity must be above 0`);
      if (inBatch.has(x.line_id)) problems.push(`${name}: ${line.inventory_item_name} is listed twice`);
      inBatch.add(x.line_id);
      if (x.quantity > 0) totals.set(x.line_id, roundMoney((totals.get(x.line_id) || 0) + x.quantity));
    }
  });
  for (const line of lines) {
    const want = remainingOf(line, released);
    const got = totals.get(line.id) || 0;
    const done = released.get(line.id) || 0;
    if (got !== want) problems.push((done
      ? `${line.inventory_item_name}: the batches add up to ${got} ${line.unit || ''}, but ${want} ${line.unit || ''} is left to release (${done} ${line.unit || ''} already released)`
      : `${line.inventory_item_name}: the batches add up to ${got} ${line.unit || ''}, but ${want} ${line.unit || ''} is agreed`).replace(/ +/g, ' '));
  }
  return problems;
}

const planKey = (plan) => JSON.stringify(plan.map((b) => [b.slip_id || null, b.needed_by_date,
  [...b.lines].sort((x, y) => x.line_id.localeCompare(y.line_id)).map((x) => [x.line_id, x.quantity])]));

/** True when two plans place the same quantities on the same batches and dates. */
export const samePlan = (a, b) => planKey(a) === planKey(b);