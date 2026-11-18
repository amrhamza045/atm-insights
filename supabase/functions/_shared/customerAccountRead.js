import { readAll } from './executiveCateringCommon.js';
import { scopeAccount, r2 } from './customerAccountBuild.js';
import { sortRows } from './reportSort.js';

// The saved customer accounts seen through the report's company/branch, search
// and date filters, totalled and paged on the server.
const COLUMNS = {
  name: (a) => a.client_name, events: (a) => a.event_count, quoted: (a) => a.total_quoted,
  paid: (a) => a.total_paid, balance: (a) => a.balance, recent: (a) => String(a.last_activity_date || ''),
};
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function scopedAccounts(svc, { branchIds, from, to, search, clientIds }) {
  const query = { branch_ids: { $in: branchIds } };
  if (search?.trim()) query.search_text = { $regex: escape(search.trim().toLowerCase()) };
  if (clientIds?.length) query.client_id = { $in: clientIds.slice(0, 500) };
  const rows = await readAll(svc.entities.CustomerAccount, query);
  return rows.map((r) => scopeAccount(r, { branchIds, from, to })).filter((r) => r.event_count > 0);
}

export function pageOf(accounts, { page = 1, pageSize = 20, sort = 'balance', dir, balanceOnly = false }) {
  const list = sortRows(balanceOnly ? accounts.filter((a) => Math.abs(a.balance) >= 0.01) : accounts, COLUMNS, { sort, dir }, 'balance', (a) => a.client_name);
  const size = Math.min(Math.max(Number(pageSize) || 20, 5), 100), pages = Math.max(1, Math.ceil(list.length / size));
  const current = Math.min(Math.max(Number(page) || 1, 1), pages);
  const totals = { total_quoted: r2(list.reduce((s, a) => s + a.total_quoted, 0)), total_paid: r2(list.reduce((s, a) => s + a.total_paid, 0)) };
  totals.balance = r2(totals.total_quoted - totals.total_paid);
  const items = list.slice((current - 1) * size, current * size).map(({ events, search_text, ...a }) => a);
  return { items, totals, count: list.length, page: current, pages, page_size: size };
}

// Remaining balances still due: by the event date for events not cancelled.
export function upcomingOf(account, today) {
  return account.events.filter((e) => e.event_status !== 'cancelled' && e.balance >= 0.01)
    .map((e) => ({ event_id: e.event_id, event_name: e.event_name, due_date: e.event_date, amount: e.balance, overdue: !!e.event_date && e.event_date < today }))
    .sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || '')));
}