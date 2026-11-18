import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Departments are stored in the Department entity — the single source of truth.
 * Nothing about departments is hardcoded in the app any more.
 */
export function useDepartments() {
  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => base44.entities.Department.list("name"),
  });
  return { departments, isLoading };
}