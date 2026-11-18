// Daily financial summaries are stored one row per branch per day, so reports can
// split them by company. Records without a branch are not counted in any row.
const total = (rows, pick) => rows.reduce((sum, r) => sum + (pick(r) || 0), 0);

// The core summary figures for one branch's paid orders, food costs and expenses of the day.
export function summaryFields({ orders, foodCosts, expenses }) {
  const revenue = total(orders, (o) => o.total);
  const cogs = total(foodCosts, (f) => f.total_food_cost);
  const opex = total(expenses, (e) => e.amount);
  const gross = revenue - cogs;
  const operating = gross - opex;
  const pct = (n) => (revenue > 0 ? (n / revenue) * 100 : 0);
  return {
    total_revenue: revenue,
    total_food_cost: cogs,
    total_cogs: cogs,
    overall_cogs_percentage: pct(cogs),
    gross_profit: gross,
    gross_profit_margin: pct(gross),
    operating_expenses: opex,
    labor_cost: total(expenses.filter((e) => e.category === 'salaries'), (e) => e.amount),
    operating_profit: operating,
    operating_margin_percentage: pct(operating),
    number_of_covers: orders.length,
    average_check: orders.length ? revenue / orders.length : 0,
  };
}

// Writes (or refreshes) each branch's row for the day and removes the old all-branch row.
// `sources` maps a name to the day's records; `build` receives the same map for one branch.
export async function saveBranchSummaries(sr, businessDate, sources, build) {
  const [branches, existing] = await Promise.all([
    sr.entities.Branch.list(),
    sr.entities.DailyFinancialSummary.filter({ business_date: businessDate }),
  ]);
  let saved = 0;
  for (const branch of branches) {
    const own = Object.fromEntries(
      Object.entries(sources).map(([key, rows]) => [key, rows.filter((r) => r.branch_id === branch.id)]),
    );
    const row = existing.find((s) => s.branch_id === branch.id);
    // Inactive branches only get a row when something was recorded there.
    if (branch.is_active === false && !row && !Object.values(own).some((rows) => rows.length)) continue;
    const data = { ...build(own), business_date: businessDate, branch_id: branch.id, branch_name: branch.name };
    if (row) await sr.entities.DailyFinancialSummary.update(row.id, data);
    else await sr.entities.DailyFinancialSummary.create(data);
    saved += 1;
  }
  await Promise.all(existing.filter((s) => !s.branch_id).map((s) => sr.entities.DailyFinancialSummary.delete(s.id)));
  return saved;
}