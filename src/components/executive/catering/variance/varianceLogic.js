export const EXCEPTION_CATEGORIES = [
  { key: "food", label: "Extra ingredient depletion" },
  { key: "equipment", label: "Equipment breakage / loss" },
  { key: "labor", label: "Overtime labor" },
  { key: "transport", label: "Transport" },
  { key: "other", label: "Other" },
];

const n = (v) => Number(v) || 0;
const lineCost = (l) => (l.line_cost != null ? n(l.line_cost) : n(l.quantity) * n(l.unit_cost));

// Expected mirrors the server margin bridge; imported comes from the latest cost run.
// budget (optional): the event's CateringCostBudget; adds budget / budgetVariance per row.
export function buildVarianceRows({ event, run, quote, exceptions, budget = null }) {
  const other = (quote?.line_items || []).filter((l) => l.cost_category === "other").reduce((s, l) => s + lineCost(l), 0);
  const byCat = (key) => exceptions.filter((x) => x.category === key).reduce((s, x) => s + n(x.amount), 0);
  const rows = [
    { key: "food", label: "Food & ingredients", expected: n(quote?.estimated_cost) - other, imported: n(run?.food_cost ?? event.actual_food_cost), source: "Release slips, waste, returns, purchase prices" },
    { key: "labor", label: "Labor", expected: n(event.estimated_labor_cost), imported: n(run?.labor_cost ?? event.actual_labor_cost), source: "Shifts, assignments, attendance" },
    { key: "equipment", label: "Equipment", expected: 0, imported: n(run?.equipment_cost ?? event.actual_equipment_cost), source: "Equipment reservations, maintenance" },
    { key: "transport", label: "Transport", expected: 0, imported: 0, source: "Manual exceptions only" },
    { key: "other", label: "Other quoted costs", expected: other, imported: 0, source: "Quote lines marked other" },
  ].map((r) => ({ ...r, exceptions: byCat(r.key) }));
  return rows.map((r) => {
    const actual = r.imported + r.exceptions;
    const b = budget ? n(budget[r.key]) : null;
    return { ...r, actual, variance: r.expected - actual, budget: b, budgetVariance: b == null ? null : b - actual };
  });
}