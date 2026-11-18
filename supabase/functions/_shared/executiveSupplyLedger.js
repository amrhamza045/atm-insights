import { openLedger } from './executiveLedger.js';
import { payableCodes } from './executiveCash.js';
import { reportUnits } from './financeAnalyticsScope.js';
import { readAll, round } from './executiveCateringCommon.js';
import { inventoryPolicy } from './inventoryAccountingRules.js';

// The posted ledger beside the cost & supply figures: the balance as of today
// of the stock accounts (debits minus credits) or the supplier payables
// (credits minus debits) for the picker's company or branch, in currency.
// available false, with the reason, when there's nothing to compare with: no
// Finance company, Finance still indexing new entries, or no such accounts set.
const STOCK_KEYS = ['INVENTORY_CONTROL_ACCOUNT', 'INVENTORY_WIP_ACCOUNT', 'RAW_INV_ACCOUNT', 'PREPPED_GOODS_INV', 'SUB_RECIPE_WIP_ACC'];

// Stock accounts: bound to inventory in Finance › Mapping Accounts.
async function stockCodes(ctx, company) {
  const { items } = await ctx.svc.entities.FinanceAccountBinding.filter({ company_id: company.id, mapping_key: { $in: STOCK_KEYS } }, { limit: 200 });
  const ids = [...new Set(items.map((b) => b.account_id).filter(Boolean))];
  if (!ids.length) return [];
  const accounts = await ctx.svc.entities.FinanceAccount.filter({ company_id: company.id, id: { $in: ids } }, { limit: 200 });
  return accounts.items.map((a) => a.code);
}

export async function ledgerBalance(ctx, input, kind) {
  const led = await openLedger(ctx, input);
  if (led.reply) return { available: false, reason: led.reply.ready === false ? 'indexing' : led.reply.reason };
  const codes = kind === 'stock' ? await stockCodes(ctx, led.company) : await payableCodes(ctx, led.company);
  if (!codes.length) return { available: false, reason: 'no_accounts', company: led.company.name };
  const r = await ctx.svc.entities.FinanceLedgerLine.aggregate({ query: { ...led.query, account_code: { $in: codes }, entry_date: { $lte: led.today } }, groupBy: 'company_id', sum: ['debit_units', 'credit_units'], limit: 5 });
  const net = (reportUnits(r.rows[0]?.sum_debit_units) - reportUnits(r.rows[0]?.sum_credit_units)) / led.scale;
  return { available: true, company: led.company.name, balance: round(kind === 'stock' ? net : -net) };
}

// The period's finished batches beside what reached the ledger: their cost
// (batches of the picked company's branches) and the production cost the
// inventory accounting engine posted for the same days (each batch posts its
// own cost). Batches finished before inventory accounting started are never
// posted, so they're left out (since: that start date). available false, with
// the reason, without a Finance company or while inventory accounting is off
// or starts after the period.
export async function postedProduction(ctx, scope, batches) {
  const { company, period } = scope;
  if (!company) return { available: false, reason: 'no_company' };
  const policy = inventoryPolicy(company), from = policy.from > period.from ? policy.from : period.from;
  if (!policy.enabled) return { available: false, reason: 'inventory_off', company: company.name };
  if (from > period.to) return { available: false, reason: 'inventory_later', company: company.name };
  const owned = new Set(company.branch_ids || []);
  const moves = await readAll(ctx.svc.entities.InventoryAccountingMovement, { ...scope.where, company_id: company.id, kind: 'production', entry_date: { $gte: from, $lte: period.to } });
  return {
    available: true, company: company.name, since: from > period.from ? from : null,
    operational: round(batches.filter((b) => owned.has(b.branch_id) && b.day >= from).reduce((s, b) => s + b.cost, 0)),
    balance: round(moves.filter((m) => m.journal_id).reduce((s, m) => s + (Number(m.amount) || 0), 0)),
  };
}