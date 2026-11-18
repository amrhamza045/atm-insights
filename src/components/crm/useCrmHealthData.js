import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { buildActivityMap } from "./segmentEngine";

/** Fetches clients + orders + catering events and builds activity/frequency maps. */
export function useCrmHealthData() {
  return useQuery({
    queryKey: ["crm-health-source"],
    queryFn: async () => {
      const [clients, orders, events] = await Promise.all([
        base44.entities.Client.list("-created_date", 5000),
        base44.entities.Order.list("-created_date", 10000),
        base44.entities.CateringEvent.list("-created_date", 2000),
      ]);
      const orderCounts = {};
      orders.forEach((o) => {
        if (o.customer_id) orderCounts[o.customer_id] = (orderCounts[o.customer_id] || 0) + 1;
      });
      return { clients, activityMap: buildActivityMap(orders, events), orderCounts };
    },
  });
}