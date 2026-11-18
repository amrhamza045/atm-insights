// In-memory stand-in for the records the Executive Dashboard ledger reports
// read: one company with two branches, its posted reporting lines, budgets
// and module switches. Amounts are in currency units (2 decimals: 100 = 1.00).
const OPS = {
  $in: (v, t) => t.includes(v), $nin: (v, t) => !t.includes(v), $ne: (v, t) => v !== t, $exists: (v, t) => (v !== undefined) === t,
  $gt: (v, t) => v > t, $gte: (v, t) => v >= t, $lt: (v, t) => v < t, $lte: (v, t) => v <= t,
};
const matches = (r, q) => Object.entries(q).every(([k, v]) => (k === '$or' ? v.some((s) => matches(r, s))
  : v && typeof v === 'object' && !Array.isArray(v) ? Object.entries(v).every(([op, t]) => OPS[op](r[k], t)) : r[k] === v));

function table(rows) {
  return {
    rows,
    get: async (id) => rows.find((r) => r.id === id) || null,
    filter: async (q, options) => {
      const items = rows.filter((r) => matches(r, q));
      return options ? { items, has_more: false } : items;
    },
    count: async (q) => rows.filter((r) => matches(r, q)).length,
    aggregate: async ({ query = {}, groupBy, dateBucket, sum = [] }) => {
      const groups = new Map();
      for (const r of rows.filter((x) => matches(x, query))) {
        const g = Object.fromEntries([groupBy].flat().map((k) => [k, r[k]]));
        if (dateBucket) g[dateBucket.field] = `${String(r[dateBucket.field]).slice(0, 7)}-01`;
        const id = JSON.stringify(g), row = groups.get(id) || { ...g, count: 0, ...Object.fromEntries(sum.map((f) => [`sum_${f}`, 0])) };
        row.count += 1;
        for (const f of sum) row[`sum_${f}`] += Number(r[f] || 0);
        groups.set(id, row);
      }
      return { rows: [...groups.values()], truncated: false };
    },
  };
}

const CLASSES = { 1: 'assets', 2: 'liabilities', 4: 'revenue', 5: 'cogs', 6: 'operating_expenses', 7: 'other_result', 8: 'income_tax' };
const CASH = ['110100', '110300'];
const iso = (d) => d.toISOString().slice(0, 10);

// The dates the reports resolve on a UTC company calendar: month to date and
// the same days of the previous month.
export function reportDates() {
  const today = iso(new Date()), now = new Date(`${today}T00:00:00Z`);
  const previous = iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
  return { today, from: `${today.slice(0, 8)}01`, previous, days: now.getUTCDate(), monthDays: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate() };
}

export default function executiveLedgerFixture({ disabled = [], locked = '' } = {}) {
  const t = {};
  const entities = new Proxy({}, { get: (_, name) => (t[name] ||= table([])) });
  entities.SystemSettings.rows.push({ setting_key: 'timezone_settings', timezone_offset_minutes: 0 }, { setting_key: 'default', disabled_modules: disabled });
  entities.FinanceCompany.rows.push({ id: 'c', name: 'Rosemary', currency: 'EGP', currency_decimals: 2, branch_ids: ['b1', 'b2'] });
  entities.Branch.rows.push({ id: 'b1', name: 'Downtown' }, { id: 'b2', name: 'Airport' });
  for (const [code, name] of [['410100', 'Food sales'], ['410300', 'Catering revenue'], ['510100', 'Food cost'], ['610100', 'Salaries'], ['710100', 'Interest income']]) {
    entities.FinanceAccount.rows.push({ id: code, company_id: 'c', code, name });
  }
  // One posted ledger line; cash lines carry their movement in the operating
  // section unless another section (opening, transfer) is given.
  const line = (branch, date, code, debit, credit, extra = {}) => {
    const cash = CASH.includes(code) ? debit - credit : 0, section = extra.section || 'operating';
    entities.FinanceLedgerLine.rows.push({
      company_id: 'c', branch_id: branch, entry_date: date, account_code: code, classification: CLASSES[code[0]],
      debit_units: debit, credit_units: credit, cash_units: cash, cash_operating: section === 'operating' ? cash : 0,
      cash_opening: section === 'opening' ? cash : 0, cash_investing: 0, cash_financing: 0, cash_unclassified: 0,
      service_type: extra.service_type || 'unassigned', journal_id: extra.journal || '',
    });
  };
  const ctx = { svc: { entities }, admin: !locked, permissions: locked ? { branch_id: locked } : {}, user: { email: 'manager@example.invalid' } };
  return { ctx, entities, line, dates: reportDates() };
}