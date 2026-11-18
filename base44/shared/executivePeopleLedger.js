import { openLedger, TOO_MANY } from './executiveLedger.js';
import { reportUnits } from './financeAnalyticsScope.js';
import { requireValue } from './financeValidation.js';
import { round } from './executiveCateringCommon.js';

// The posted ledger beside Labor Cost, for whole payroll months ("YYYY-MM"):
// net revenue (credits minus debits) for payroll as a share of revenue, and
// what was posted to the staff-cost accounts mapped in Finance › Mapping
// Accounts (permanent kitchen payroll and administrative salaries), debits
// minus credits. available false, with the reason, without a Finance company
// or while Finance indexes new entries; posted is null while no staff-cost
// account is mapped.
const STAFF_KEYS = ['KITCHEN_DIRECT_LABOR_EXP', 'ADMIN_SALARIES_EXPENSE'];

async function staffCodes(ctx, company) {
  const { items } = await ctx.svc.entities.FinanceAccountBinding.filter({ company_id: company.id, mapping_key: { $in: STAFF_KEYS } }, { limit: 200 });
  const ids = [...new Set(items.map((b) => b.account_id).filter(Boolean))];
  if (!ids.length) return [];
  const accounts = await ctx.svc.entities.FinanceAccount.filter({ company_id: company.id, id: { $in: ids } }, { limit: 200 });
  return accounts.items.map((a) => a.code);
}

// Debits minus credits of the matching lines dated in the months, in currency.
async function monthsTotal(ctx, led, query, months) {
  if (!months.length) return 0;
  const r = await ctx.svc.entities.FinanceLedgerLine.aggregate({
    query: { ...led.query, ...query, entry_date: { $gte: `${months[0]}-01`, $lte: `${months.at(-1)}-31` } },
    dateBucket: { field: 'entry_date', unit: 'month' }, sum: ['debit_units', 'credit_units'], limit: 1000,
  });
  requireValue(!r.truncated, TOO_MANY);
  const units = r.rows.filter((x) => months.includes(String(x.entry_date).slice(0, 7)))
    .reduce((s, x) => s + reportUnits(x.sum_debit_units) - reportUnits(x.sum_credit_units), 0);
  return round(units / led.scale);
}

export async function payrollLedger(ctx, input, months, earlierMonths) {
  const led = await openLedger(ctx, input);
  if (led.reply) return { available: false, reason: led.reply.ready === false ? 'indexing' : led.reply.reason };
  const codes = await staffCodes(ctx, led.company);
  const [revenue, earlierRevenue, posted] = await Promise.all([
    monthsTotal(ctx, led, { classification: 'revenue' }, months),
    monthsTotal(ctx, led, { classification: 'revenue' }, earlierMonths),
    codes.length ? monthsTotal(ctx, led, { account_code: { $in: codes } }, months) : null,
  ]);
  const owned = new Set((led.company.branch_ids || []).filter((b) => !led.branch || b === led.branch));
  return { available: true, company: led.company.name, owned, revenue: -revenue, earlier_revenue: -earlierRevenue, posted };
}