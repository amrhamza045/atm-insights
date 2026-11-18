import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/** Role + registration status per employee, resolved on the server (HR staff can't read permission records). */
export function useEmployeeAccess(employees = []) {
  const ids = employees.map((e) => e.id).sort();
  const { data } = useQuery({
    queryKey: ["employeeAccess", ids],
    queryFn: async () => (await base44.functions.invoke("manageEmployeeRole", { action: "list", employee_ids: ids })).data,
    enabled: ids.length > 0,
  });
  return data?.access || {};
}