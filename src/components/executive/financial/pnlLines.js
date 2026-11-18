// The Profit & Loss lines, top to bottom. accounts: the ledger class whose
// accounts a + opens under the line. flip: other items are shown as net
// income (the ledger totals keep them as a net expense).
export const PNL_LINES = [
  { key: "revenue", accounts: "revenue" },
  { key: "cost_of_sales", accounts: "cogs" },
  { key: "gross_profit", total: true },
  { key: "gross_margin", ratio: true },
  { key: "operating_expenses", accounts: "operating_expenses" },
  { key: "operating_profit", total: true },
  { key: "other_result", accounts: "other_result", flip: true },
  { key: "income_tax", accounts: "income_tax" },
  { key: "net_profit", total: true },
  { key: "net_margin", ratio: true },
];

// A line's amount in a set of figures; null stays null.
export function lineValue(figures, line) {
  const v = figures?.[line.key];
  return v == null ? null : line.flip ? -v : v;
}