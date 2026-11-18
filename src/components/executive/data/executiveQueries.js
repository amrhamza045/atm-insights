import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useBranch } from "@/components/branches/BranchContext";
import { useCateringFilter } from "@/components/executive/catering/CateringFilterContext";

// Data layer of the Executive Dashboard. Every figure is totalled on the server
// for the header picker's selection and the standard period: executiveFinance
// reads the posted ledger, executiveMetrics the day-to-day records.
async function call(name, payload) {
  const response = await base44.functions.invoke(name, payload).catch((error) => {
    throw new Error(error?.response?.data?.error || error?.message || "The figures could not be loaded.");
  });
  return response.data;
}

// Company mode reads the whole company, otherwise the working branch. Without
// the branch picker the server reads the first live company and all branches.
function usePickerScope() {
  const { multiBranch, selectedCompany, selectedBranchId, selectedBranchIds } = useBranch();
  if (!multiBranch) return { branch_ids: [] };
  return selectedCompany
    ? { company_id: selectedCompany.id, branch_ids: selectedBranchIds }
    : { branch_id: selectedBranchId || undefined, branch_ids: selectedBranchIds };
}

// Ledger figures. While Finance adds newly posted journals to its reporting
// index the reply is { ready: false } and the query asks again shortly.
export function useExecutiveFinance(action, params) {
  const { company_id, branch_id } = usePickerScope();
  return useQuery({
    queryKey: ["executiveFinance", action, company_id, branch_id, params],
    queryFn: () => call("executiveFinance", { action, company_id, branch_id, ...params }),
    refetchInterval: (query) => (query.state.data?.ready === false ? 4000 : false),
    staleTime: 5 * 60_000,
  });
}

export function useExecutiveMetrics(params) {
  const { branch_ids } = usePickerScope();
  return useQuery({
    queryKey: ["executiveMetrics", branch_ids, params],
    queryFn: () => call("executiveMetrics", { branch_ids, ...params }),
    staleTime: 5 * 60_000,
  });
}

// Catering figures from the event records, for the picker's branches, the
// standard period and the catering filter bar (venue and event type), in the
// currency of the picked Finance company.
export function useExecutiveCatering(action, params) {
  const scope = usePickerScope();
  const { serverFilter } = useCateringFilter();
  return useQuery({
    queryKey: ["executiveCatering", action, scope, params, serverFilter],
    queryFn: () => call("executiveCatering", { action, ...scope, ...params, ...(serverFilter && { filter: serverFilter }) }),
    staleTime: 5 * 60_000,
  });
}

// Cost & supply figures from the stock, purchasing and menu records of the
// picker's branches for the standard period, with the posted ledger's stock or
// supplier accounts beside them (asked again shortly while Finance indexes).
export function useExecutiveSupply(action, params) {
  const scope = usePickerScope();
  return useQuery({
    queryKey: ["executiveSupply", action, scope, params],
    queryFn: () => call("executiveSupply", { action, ...scope, ...params }),
    refetchInterval: (query) => (query.state.data?.ledger?.reason === "indexing" ? 4000 : false),
    staleTime: 5 * 60_000,
  });
}

// People figures from the HR records of the picker's branches for the standard
// period, with the posted ledger beside payroll (asked again shortly while
// Finance indexes).
export function useExecutivePeople(action, params) {
  const scope = usePickerScope();
  return useQuery({
    queryKey: ["executivePeople", action, scope, params],
    queryFn: () => call("executivePeople", { action, ...scope, ...params }),
    refetchInterval: (query) => ([query.state.data?.ledger?.reason, query.state.data?.revenue_reason].includes("indexing") ? 4000 : false),
    staleTime: 5 * 60_000,
  });
}

// Customers & growth figures from the CRM and catering records for the
// standard period: leads and client care for the whole business, clients for
// the picker's branches.
export function useExecutiveCustomers(action, params) {
  const scope = usePickerScope();
  return useQuery({
    queryKey: ["executiveCustomers", action, scope, params],
    queryFn: () => call("executiveCustomers", { action, ...scope, ...params }),
    staleTime: 5 * 60_000,
  });
}

// Alerts & insights: today's alerts and the 90-day outlook for the picker's
// branches. AI insights pass { enabled: false } and run only on refetch().
export function useExecutiveInsights(action, params, options = {}) {
  const scope = usePickerScope();
  return useQuery({
    queryKey: ["executiveInsights", action, scope, params],
    queryFn: () => call("executiveInsights", { action, ...scope, ...params }),
    staleTime: action === "ai" ? Infinity : 5 * 60_000,
    ...options,
  });
}

// What a ledger report shows instead of its content (a ReportState), or null.
export function financeState(query) {
  if (query.isLoading) return "loading";
  if (query.isError) return "error";
  if (query.data?.ready === false) return "indexing";
  if (query.data?.available === false) return query.data.reason;
  return null;
}