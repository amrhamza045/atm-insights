// Salary-advance policy rules. Pure logic + small loaders; used by the employeeBorrowing function.
import { getCompanyOffset, dayInOffset, dayWindow } from './companyTimezone.js';

export const POLICY_KEY = 'borrowing_policy';

export const DEFAULT_POLICY = {
  enabled: true,
  max_percent_of_salary: 50,
  min_notice_hours: 48,
  windows: [
    { day: 10, percent: 20, cutoff_days_before: 2, cutoff_time: '17:00' },
    { day: 25, percent: 30, cutoff_days_before: 2, cutoff_time: '17:00' },
  ],
};

export async function loadPolicy(svc) {
  const [rec] = await svc.BorrowingPolicy.filter({ setting_key: POLICY_KEY });
  return rec ? { ...rec, is_default: false } : { ...DEFAULT_POLICY, is_default: true };
}

/** Returns an error string, or null when the policy is valid. */
export function validatePolicy(p) {
  const max = Number(p.max_percent_of_salary);
  if (!(max > 0 && max <= 100)) return 'Maximum percentage must be between 1 and 100.';
  if (!(Number(p.min_notice_hours) >= 0)) return 'Minimum notice hours must be 0 or more.';
  if (!Array.isArray(p.windows) || p.windows.length === 0) return 'Add at least one disbursement window.';
  const days = new Set();
  let total = 0;
  for (const w of p.windows) {
    const day = Number(w.day), pct = Number(w.percent), before = Number(w.cutoff_days_before);
    if (!Number.isInteger(day) || day < 1 || day > 31) return 'Each window needs a day of month between 1 and 31.';
    if (days.has(day)) return `Day ${day} is configured twice.`;
    days.add(day);
    if (!(pct > 0 && pct <= 100)) return `Window on day ${day}: percentage must be between 1 and 100.`;
    if (!Number.isInteger(before) || before < 0 || before > 31) return `Window on day ${day}: cutoff days before must be 0-31.`;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(w.cutoff_time || ''))) return `Window on day ${day}: cutoff time must be HH:MM.`;
    total += pct;
  }
  if (total > max) return `Window percentages add up to ${total}%, above the ${max}% monthly maximum.`;
  return null;
}

const pad = (n) => String(n).padStart(2, '0');

function disbursementDate(year, month, day) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad(month)}-${pad(Math.min(day, last))}`;
}

function windowInfo(w, date, offset, policy, now) {
  const disburseAt = dayWindow(date, offset).start;
  const [h, m] = String(w.cutoff_time).split(':').map(Number);
  const cutoffAt = disburseAt - Number(w.cutoff_days_before) * 86400000 + (h * 60 + m) * 60000;
  const noticeAt = disburseAt - Number(policy.min_notice_hours) * 3600000;
  const deadline = Math.min(cutoffAt, noticeAt);
  return { date, day: Number(w.day), percent: Number(w.percent), cutoff_at: new Date(deadline).toISOString(), open: now <= deadline };
}

/** Upcoming windows (this month + next two) that have not yet passed, with their open/closed state. */
export function upcomingWindows(policy, offset, now = Date.now()) {
  const [y, m] = dayInOffset(now, offset).split('-').map(Number);
  const today = dayInOffset(now, offset);
  const out = [];
  for (let i = 0; i < 3; i++) {
    const idx = m - 1 + i;
    const year = y + Math.floor(idx / 12), month = (idx % 12) + 1;
    for (const w of policy.windows) {
      const date = disbursementDate(year, month, Number(w.day));
      if (date >= today) out.push(windowInfo(w, date, offset, policy, now));
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export async function monthlySalary(svc, employeeId) {
  const [priv] = await svc.EmployeePrivate.filter({ employee_record_id: employeeId });
  const n = Number(priv?.fixed_salary);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Windows enriched with what this employee may still borrow in each. */
export async function windowsForEmployee(svc, employeeId, policy, offset) {
  const salary = await monthlySalary(svc, employeeId);
  const borrowings = (await svc.EmployeeBorrowing.filter({ employee_id: employeeId })).filter((b) => b.status !== 'cancelled');
  const monthCap = salary ? (salary * Number(policy.max_percent_of_salary)) / 100 : 0;
  const windows = upcomingWindows(policy, offset).map((w) => {
    const usedWindow = borrowings.filter((b) => b.borrow_date === w.date).reduce((s, b) => s + (b.amount || 0), 0);
    const usedMonth = borrowings.filter((b) => (b.borrow_date || '').slice(0, 7) === w.date.slice(0, 7)).reduce((s, b) => s + (b.amount || 0), 0);
    const windowLimit = salary ? (salary * w.percent) / 100 : 0;
    const allowed = Math.max(0, Math.min(windowLimit - usedWindow, monthCap - usedMonth));
    return { ...w, window_limit: windowLimit, used_in_window: usedWindow, used_in_month: usedMonth, month_cap: monthCap, allowed: Math.round(allowed * 100) / 100 };
  });
  return { salary, windows };
}

export { getCompanyOffset };