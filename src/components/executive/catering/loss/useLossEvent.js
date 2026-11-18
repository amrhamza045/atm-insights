import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// A record the person can't open (missing, or outside their access) reads as none.
const orNone = (request) => request.catch((e) => ([403, 404].includes(e?.status ?? e?.response?.status) ? null : Promise.reject(e)));

// One event with its latest actual-cost calculation and its quote, for the walkthrough.
export default function useLossEvent(id) {
  return useQuery({
    queryKey: ["lossEvent", id],
    enabled: !!id,
    queryFn: async () => {
      const event = await orNone(base44.entities.CateringEvent.get(id));
      if (!event) return null;
      const [run, active] = await Promise.all([
        event.actual_cost_run_id ? orNone(base44.entities.CateringActualCostRun.get(event.actual_cost_run_id)) : null,
        event.active_quote_id ? orNone(base44.entities.CateringQuote.get(event.active_quote_id)) : null,
      ]);
      const quote = active || (await base44.entities.CateringQuote.filter({ event_id: id, status: "accepted" }))[0] || null;
      return { event, run, quote };
    },
  });
}