import { useQuery } from "@tanstack/react-query";
import { loadServiceRecords, serviceTotalsFrom, serviceLinesFrom } from "./serviceBilling";

/** Staffing & logistics charges of one event, live from its assignments and trips. */
export default function useEventServiceTotals(eventId) {
  const { data } = useQuery({
    queryKey: ["catering-service-totals", eventId],
    queryFn: async () => {
      const records = await loadServiceRecords(eventId);
      return { ...serviceTotalsFrom(records), lines: serviceLinesFrom(records) };
    },
    enabled: !!eventId,
  });
  return data || { staffing: 0, logistics: 0, total: 0, lines: { staffing: [], logistics: [], grand_total: 0 } };
}