import { base44 } from "@/api/base44Client";

// Finance reporting server calls (company, branch and dates from the Finance filters).
async function reportCall(fn, action, company, filters, extra) {
  const response = await base44.functions.invoke(fn, {
    action, company_id: company.id, branch_id: filters.branch_id || "", from: filters.from || "", to: filters.to || "", ...extra,
  });
  if (response.data?.error) throw new Error(response.data.error);
  return response.data;
}

export const customerCall = (action, company, filters, extra = {}) => reportCall("customerAccounts", action, company, filters, extra);
export const supplierCall = (action, company, filters, extra = {}) => reportCall("supplierStatements", action, company, filters, extra);

export const money = (v, currency) =>
  `${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0)}${currency ? ` ${currency}` : ""}`;