import { isCentralAdmin } from './platformRole.js';
import { TIMEZONE_MISSING, dayInOffset } from './companyTimezone.js';
export const numberOrNull = (v) => v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
export const roundMoney = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
export const sumAmounts = (rows) => roundMoney(rows.reduce((sum, r) => sum + (r.amount || 0), 0));
// Set once per run from the company timezone (see loadActualSources).
let businessOffset = null;
export const setBusinessOffset = (minutes) => { businessOffset = minutes; };
export function businessDay(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  if (businessOffset === null) throw new Error(TIMEZONE_MISSING);
  return dayInOffset(date, businessOffset);
}
export async function readAll(entity, filter = {}) {
  const rows = [];
  for (let skip = 0; ; skip += 200) {
    const page = await entity.filter(filter, 'id', 200, skip);
    rows.push(...page);
    if (page.length < 200) return rows;
  }
}
export function flag(warnings, code, sourceId = '', detail = '') {
  warnings.push({ code, source_id: sourceId, detail });
}
export function assertEventBranch(user, permissions, event) {
  if (isCentralAdmin(user, permissions)) return;
  const branches = user.catering_branch_ids || [];
  if (!event.branch_id || !branches.includes(event.branch_id) || (permissions?.branch_id && permissions.branch_id !== event.branch_id)) {
    const error = new Error('Forbidden: event is outside your catering branches');
    error.status = 403;
    throw error;
  }
}