// What a figure shows when its comparison has no value for it.
export function missingText(comparison) {
  if (comparison.key !== "budget") return "No comparison";
  if (comparison.reason === "not_budgeted") return "Not budgeted";
  return comparison.available ? "Budget has empty months" : "No approved budget";
}

// Where Finance keeps the settings the reports point to.
export const FINANCE_BUDGET_URL = "/Finance?finance_view=analytics&tab=planning";
export const FINANCE_MAPPING_URL = "/Finance?finance_view=configuration&tab=mapping";