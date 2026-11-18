import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/** Admin-managed option lists for event type, service style and dress code. */
export function useCateringOptions(listType) {
  const { data: options = [], isLoading } = useQuery({
    queryKey: ["catering-options", listType],
    queryFn: () => base44.entities.CateringOption.filter({ list_type: listType }, "sort_order", 200),
  });
  return { options: options.filter((o) => o.is_active !== false), allOptions: options, isLoading };
}