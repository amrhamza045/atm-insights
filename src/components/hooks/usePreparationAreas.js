import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function usePreparationAreas() {
  return useQuery({
    queryKey: ["preparationAreas"],
    queryFn: () => base44.entities.PreparationArea.list("sort_order"),
    staleTime: 30000
  });
}

export function useActivePreparationAreas() {
  const { data = [] } = usePreparationAreas();
  return data.filter(a => a.is_active !== false);
}