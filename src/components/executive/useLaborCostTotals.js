import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Branch × month labor-cost totals from the server (no per-person rows).
 * Users without financial view get an empty list, so charts show their empty state.
 */
export default function useLaborCostTotals() {
  return useQuery({
    queryKey: ["labor-cost-totals"],
    queryFn: async () => {
      const res = await base44.functions.invoke("getLaborCostTotals", {}).catch(() => null);
      return res?.data?.rows || [];
    },
    staleTime: 300000,
  });
}