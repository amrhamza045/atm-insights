import { createContext, useContext, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DEFAULT_VENUE_FILTER, eventMatchesVenueFilter, isVenueFilterActive } from "./cateringVenueFilter";
import {
  DEFAULT_DATE_FILTER,
  EMPTY_RANGE,
  eventMatchesDateRange,
  isDateRangeActive,
  resolveDateRange,
} from "./cateringDateFilter";
import {
  DEFAULT_PACKAGE_FILTER,
  eventMatchesPackageFilter,
  isPackageFilterActive,
} from "./cateringPackageFilter";

const CateringFilterContext = createContext(null);

export function CateringFilterProvider({ children }) {
  const [locationType, setLocationType] = useState(DEFAULT_VENUE_FILTER.locationType);
  const [venueNames, setVenueNames] = useState(DEFAULT_VENUE_FILTER.venueNames);
  const [dateFilter, setDateFilter] = useState(DEFAULT_DATE_FILTER);
  const [packageFilter, setPackageFilter] = useState(DEFAULT_PACKAGE_FILTER);

  // Quotes carry the package identity of each event — needed to resolve the event-type filter.
  const { data: quotes = [] } = useQuery({
    queryKey: ["execCateringQuotes"],
    queryFn: () => base44.entities.CateringQuote.list("-created_date", 1000),
  });

  const quoteById = useMemo(() => {
    const map = {};
    quotes.forEach((q) => { map[q.id] = q; });
    return map;
  }, [quotes]);

  const value = useMemo(
    () => ({
      locationType, venueNames, dateFilter, packageFilter, quoteById,
      setLocationType, setVenueNames, setDateFilter, setPackageFilter,
    }),
    [locationType, venueNames, dateFilter, packageFilter, quoteById]
  );
  return <CateringFilterContext.Provider value={value}>{children}</CateringFilterContext.Provider>;
}

// Safe outside a provider: behaves as an inactive (pass-through) filter.
export function useCateringFilter() {
  const ctx = useContext(CateringFilterContext);
  const locationType = ctx?.locationType ?? "all";
  const venueNames = ctx?.venueNames ?? DEFAULT_VENUE_FILTER.venueNames;
  const dateFilter = ctx?.dateFilter ?? DEFAULT_DATE_FILTER;
  const packageFilter = ctx?.packageFilter ?? DEFAULT_PACKAGE_FILTER;
  const quoteById = ctx?.quoteById ?? {};

  return useMemo(() => {
    const venueFilter = { locationType, venueNames };
    const dateRange = ctx ? resolveDateRange(dateFilter) : EMPTY_RANGE;
    const venueActive = isVenueFilterActive(venueFilter);
    const dateActive = isDateRangeActive(dateRange);
    const packageActive = isPackageFilterActive(packageFilter);
    const isActive = venueActive || dateActive || packageActive;

    // Venue, date and event type compose: an event must satisfy all three to survive.
    const matchesEvent = (e) =>
      eventMatchesVenueFilter(e, venueFilter) &&
      eventMatchesDateRange(e, dateRange) &&
      eventMatchesPackageFilter(e, packageFilter, quoteById);

    const filterEvents = (events = []) => (isActive ? events.filter(matchesEvent) : events);
    const eventIdSet = (events = []) => (isActive ? new Set(filterEvents(events).map((e) => e.id)) : null);
    // Narrow event-linked rows (payments, quotes, assignments, reservations…) to the filtered events.
    const filterByEvent = (rows = [], events = []) => {
      const ids = eventIdSet(events);
      return ids ? rows.filter((r) => ids.has(r.event_id)) : rows;
    };

    // What the server-totalled reports send: venue and event type only (their period bar sets the dates).
    const serverFilter = venueActive || packageActive
      ? { location_type: locationType, venue_names: venueNames, categories: packageFilter.categories || [], packages: packageFilter.packages || [] }
      : null;

    return {
      serverFilter,
      locationType,
      venueNames,
      dateFilter,
      dateRange,
      packageFilter,
      setLocationType: ctx?.setLocationType ?? (() => {}),
      setVenueNames: ctx?.setVenueNames ?? (() => {}),
      setDateFilter: ctx?.setDateFilter ?? (() => {}),
      setPackageFilter: ctx?.setPackageFilter ?? (() => {}),
      venueActive,
      dateActive,
      packageActive,
      isActive,
      matchesEvent,
      filterEvents,
      eventIdSet,
      filterByEvent,
    };
  }, [locationType, venueNames, dateFilter, packageFilter, quoteById, ctx]);
}