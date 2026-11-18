import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Public brand record (logo, name, colors, contact) — shared cache key with the app shell.
export function useBrandInfo() {
  return useQuery({
    queryKey: ["restaurantInfo"],
    queryFn: async () => {
      try {
        const info = await base44.entities.RestaurantInfo.list();
        return info[0] || null;
      } catch {
        return null;
      }
    },
  });
}