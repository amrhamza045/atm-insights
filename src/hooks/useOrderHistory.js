import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

/**
 * Fetches ALL orders with pagination to ensure complete history is returned.
 * Filters by orderType and last 6 hours.
 */
export function useOrderHistory(orderType) {
  const { data: allOrders = [] } = useQuery({
    queryKey: ["allOrdersForHistory"],
    queryFn: async () => {
      let result = [];
      let skip = 0;
      const batchSize = 200;
      while (true) {
        const batch = await base44.entities.Order.list("-created_date", batchSize, skip);
        if (!batch || batch.length === 0) break;
        result = result.concat(batch);
        if (batch.length < batchSize) break;
        skip += batchSize;
      }
      return result;
    },
    staleTime: 0
  });

  const cutoff = Date.now() - SIX_HOURS_MS;

  const orders = Array.from(
    new Map(
      allOrders
        .filter(o => o.order_type === orderType && new Date(o.created_date).getTime() >= cutoff)
        .map(o => [o.id, o])
    ).values()
  );

  return orders;
}