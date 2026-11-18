import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/** Signed-in account whose email matches an active HR employee record. */
export const activeEmployeeQuery = {
  queryKey: ["landingHrEmployee"],
  queryFn: async () => {
    if (!(await base44.auth.isAuthenticated())) return false;
    const me = await base44.auth.me();
    if (!me?.email) return false;
    const rows = await base44.entities.Employee.filter({ email: me.email });
    return rows.some((e) => e.status !== "terminated" && e.status !== "inactive");
  },
  staleTime: 60_000,
};

/** True only for signed-in users whose email matches an active HR employee record. */
export function useIsHrEmployee() {
  const { data } = useQuery(activeEmployeeQuery);
  return !!data;
}