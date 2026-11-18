import useDebouncedValue from "@/hooks/useDebouncedValue";
import useAllEventsPages from "./useAllEventsPages";
import { textSearch, whenQuery } from "./allEventsQuery";

/**
 * An all-events list behind the shared filters: a text search over
 * `searchFields`, upcoming / past for lists that carry an event date (`when`),
 * and the tab's own filter `query`.
 */
export default function useFilteredList({ entity, cacheKey, search = "", when, query = {}, searchFields = "event_name", sort = "-created_date", enabled = true }) {
  const term = useDebouncedValue(search.trim());
  const range = when ? whenQuery("event_date", when) : { query: {}, sort };
  return useAllEventsPages({
    entity,
    cacheKey,
    sort: range.sort,
    query: { ...range.query, ...textSearch(searchFields, term), ...query },
    enabled,
  });
}

/** Events of the selected branch behind the shared filters, searched by event or client name. */
export const useEventsList = (filters, query) =>
  useFilteredList({ entity: "CateringEvent", cacheKey: "catering-events", searchFields: ["event_name", "client_name"], ...filters, query });