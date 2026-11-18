import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Companies from Admin › Companies, used to group the header branch picker.
export function useBranchCompanies(enabled) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["branchCompanies"],
    queryFn: async () => {
      if (!(await base44.auth.isAuthenticated())) return [];
      const response = await base44.functions.invoke("listBranchCompanies", {});
      return response.data?.companies || [];
    },
    enabled,
    staleTime: 60_000,
  });
  return { companies: data, isLoading };
}

// One group per company with its visible branches. A branch listed by both a live
// and a test company appears once, under the live one. Unassigned branches come last.
export function groupBranches(branches, companies) {
  const owner = new Map();
  [...companies]
    .sort((a, b) => Number(a.is_test) - Number(b.is_test))
    .forEach((c) => c.branch_ids.forEach((id) => { if (!owner.has(id)) owner.set(id, c.id); }));
  const groups = companies
    .map((company) => ({ company, branches: branches.filter((b) => owner.get(b.id) === company.id) }))
    .filter((g) => g.branches.length > 0);
  const rest = branches.filter((b) => !owner.has(b.id));
  return rest.length ? [...groups, { company: null, branches: rest }] : groups;
}