import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapPin, Tags } from "lucide-react";
import { useCateringFilter } from "./CateringFilterContext";
import { distinctVenueNames } from "./cateringVenueFilter";
import VenueNameSelect from "./VenueNameSelect";
import { DEFAULT_DATE_FILTER } from "./cateringDateFilter";
import CateringDateFilter from "./CateringDateFilter.jsx";
import EventTypeSelect from "./EventTypeSelect";
import { DEFAULT_PACKAGE_FILTER, buildPackageGroups } from "./cateringPackageFilter";

const LOCATION_TYPES = [
  { key: "all", label: "All" },
  { key: "on_site", label: "On-site" },
  { key: "off_site", label: "Off-site" },
];

// The Catering calendar passes the events it shows and its own date choice, in
// place of the date filter its calendar views already cover. Executive
// Analytics loads the venues itself and keeps the date filter, except on the
// reports with the period bar (dateControl={false}), whose dates it sets.
export default function VenueFilterBar({ events: shownEvents, dateControl }) {
  const {
    locationType, venueNames, packageFilter,
    setLocationType, setVenueNames, setDateFilter, setPackageFilter, isActive, venueActive, packageActive,
  } = useCateringFilter();
  const dated = dateControl !== false;

  const { data: loadedEvents = [] } = useQuery({
    queryKey: ["execCateringEvents"],
    queryFn: () => base44.entities.CateringEvent.list("-event_date", 500),
    enabled: !shownEvents,
  });
  const events = shownEvents || loadedEvents;

  const { data: packages = [] } = useQuery({
    queryKey: ["execCateringPackages"],
    queryFn: () => base44.entities.CateringPackage.list("-created_date", 500),
  });

  const packageGroups = buildPackageGroups(packages);

  const pool = locationType === "all" ? events : events.filter((e) => (e.location_type || "on_site") === locationType);
  const options = distinctVenueNames(pool);

  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-2xl px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <MapPin className="w-3.5 h-3.5 text-amber-500" />
        Venue:
      </span>

      <div className="flex gap-1.5">
        {LOCATION_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setLocationType(t.key); setVenueNames([]); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              locationType === t.key
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <VenueNameSelect options={options} selected={venueNames} onChange={setVenueNames} />

      <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <Tags className="w-3.5 h-3.5 text-amber-500" />
        Event Type:
      </span>

      <EventTypeSelect
        groups={packageGroups}
        categories={packageFilter.categories}
        packages={packageFilter.packages}
        onChange={setPackageFilter}
      />

      {dated && <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />}

      {dated && (dateControl ?? <CateringDateFilter />)}

      {(dated ? isActive : venueActive || packageActive) && (
        <button
          type="button"
          onClick={() => { setLocationType("all"); setVenueNames([]); setDateFilter(DEFAULT_DATE_FILTER); setPackageFilter(DEFAULT_PACKAGE_FILTER); }}
          className="ml-auto text-xs text-slate-400 hover:text-slate-700 underline-offset-2 hover:underline"
        >
          Clear
        </button>
      )}
      </div>
    </div>
  );
}