import { branchQuery, financeBranch } from './financeAccess.js';
import { ensureLedgerIndex } from './financeReadIndex.js';
import { resolvePeriod } from './executivePeriod.js';
import { moduleSwitches } from './executiveAccess.js';
import { pickCompany } from './executiveCompany.js';

// How Executive Dashboard reports open the posted ledger (Finance's reporting
// index): whose ledger, the standard period and comparison, and the part of
// every reply that says so. Replies carry totals, never single entries.
export const PL = ['revenue', 'cogs', 'operating_expenses', 'other_result', 'income_tax'];
export const TOO_MANY = 'This period has too many reporting groups to total completely; no partial figures are shown.';
export const within = (range) => ({ $gte: range.from, $lte: range.to });

// The picked company, the company owning the picked branch, or (no picker) the
// first live company. The whole company is read in company mode or when
// wholeCompany, else the picked branch; a person locked to one branch always
// reads only that branch.
async function ledgerScope(ctx, input, wholeCompany) {
  const company = await pickCompany(ctx.svc, input);
  if (!company) return null;
  const locked = !ctx.admin && ctx.permissions.branch_id ? ctx.permissions.branch_id : '';
  const branch = input.company_id || wholeCompany ? locked : input.branch_id || locked;
  if (branch) financeBranch(ctx, company, branch);
  return { company, branch, query: { company_id: company.id, ...(branch ? { branch_id: branch } : branchQuery(ctx, company)) } };
}

// The ledger a report reads with its period and comparison, once Finance's
// reporting index holds every posted journal (analytics: with channel tags).
// module: the Admin › Modules switch the report belongs to. An answer that
// ends the report early (module off, no company, still indexing) is { reply }.
export async function openLedger(ctx, input, { module, analytics = false, wholeCompany = false } = {}) {
  const [{ today, unit, period, comparison }, isOn] = await Promise.all([resolvePeriod(ctx.svc.entities, input), moduleSwitches(ctx)]);
  const dates = { today, unit, period, comparison };
  if (module && !isOn(module)) return { reply: { ready: true, available: false, reason: 'module_off', ...dates } };
  const scope = await ledgerScope(ctx, input, wholeCompany);
  if (!scope) return { reply: { ready: true, available: false, reason: 'no_company', ...dates } };
  if (!(await ensureLedgerIndex(ctx, scope.company, analytics))) return { reply: { ready: false } };
  return { ...dates, ...scope, isOn, byBudget: comparison.key === 'budget', scale: 10 ** scope.company.currency_decimals };
}

// Journals the period leaves out: waiting for review, or blocked automatic postings.
export async function leftOut(ctx, led) {
  const where = { ...led.query, entry_date: within(led.period) };
  const [pending, blocked] = await Promise.all([
    ctx.svc.entities.FinanceProposal.count({ ...where, status: 'pending' }),
    ctx.svc.entities.FinancePostingIssue.count({ ...where, status: 'open' }),
  ]);
  return { pending_proposals: pending, posting_issues: blocked };
}

// What every ledger reply says about itself: whose ledger, which dates and
// whether its comparison exists. budget: what the budget comparison found;
// budgeted false for figures no budget covers (cash).
export function ledgerReply(led, { omitted, hasActivity, budget = null, budgeted = true }) {
  const { company } = led, missing = led.byBudget && !budget;
  return {
    ready: true,
    available: true,
    today: led.today,
    unit: led.unit,
    company: { id: company.id, name: company.name, currency: company.currency, is_test: !!company.is_test },
    branch_id: led.branch || null,
    period: led.period,
    comparison: { ...led.comparison, available: !missing, reason: missing ? (budgeted ? 'no_budget' : 'not_budgeted') : null },
    has_activity: hasActivity,
    ...omitted,
  };
}