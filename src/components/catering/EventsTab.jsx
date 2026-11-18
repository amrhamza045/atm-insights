import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, CalendarDays, MapPin, Users, Pencil, XCircle, Check, AlertTriangle, Truck, Trash2, Search } from "lucide-react";
import { useBranch } from "@/components/branches/BranchContext";
import EventFormDialog from "./EventFormDialog";
import CancelEventDialog from "./CancelEventDialog";
import DeleteEventDialog from "./DeleteEventDialog";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { daysUntil } from "./cateringLogic";
import { staffingAlert } from "./staffing";
import { eventRiskCountFromRecord } from "./executionLogic";
import { serviceTotalsFrom, eventTotal } from "./serviceBilling";
import EventsFilterBar from "./EventsFilterBar";
import EventDateRangeSelect from "./EventDateRangeSelect";
import EventSortSelect from "./EventSortSelect";
import EventsPaginationBar from "./EventsPaginationBar";
import usePaginatedEvents from "./usePaginatedEvents";
import { useCateringEditAccess } from "./useCateringEditAccess";
import { EVENT_STATUS_STYLES as STATUS_STYLES } from "./eventLabels";
import PolicyApprovalBadge from "./payment-policies/PolicyApprovalBadge";

export default function EventsTab({ selectedEventId, onSelectEvent, quickActions = null, autoOpenNew = false, onAutoOpened }) {
  const { canEdit, canEditRecord } = useCateringEditAccess();
  const { selectedBranchId } = useBranch();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [search, setSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState(null);
  const [locationTypeFilter, setLocationTypeFilter] = useState(null);
  // Upcoming by default; past and other dates are read from the server only when chosen.
  const [dateRange, setDateRange] = useState("upcoming");
  const [sortBy, setSortBy] = useState("date_asc");

  // Arrived from Quick Actions › New Event: start the usual New Event form.
  useEffect(() => {
    if (!autoOpenNew) return;
    if (canEdit) { setEditing(null); setShowForm(true); }
    onAutoOpened?.();
  }, [autoOpenNew]);

  const {
    events: filteredEvents,
    totalCount,
    windowTotal,
    eventTypes,
    page,
    totalPages,
    pageSize,
    hasNextPage,
    hasPrevPage,
    isLoading,
    isFetchingPage,
    goToNextPage,
    goToPrevPage,
    goToPage,
  } = usePaginatedEvents({
    dateRange,
    eventType: eventTypeFilter,
    locationType: locationTypeFilter,
    sortBy,
    search,
  });

  // Trips and crew of the events on screen only.
  const eventIds = useMemo(() => filteredEvents.map((e) => e.id).sort(), [filteredEvents]);
  const { data: trips = [] } = useQuery({
    queryKey: ["catering-trips-branch", selectedBranchId, eventIds],
    queryFn: () => base44.entities.CateringTrip.filter({ branch_id: selectedBranchId, event_id: { $in: eventIds } }, "-created_date", 300),
    enabled: !!selectedBranchId && eventIds.length > 0,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["catering-assignments-branch", selectedBranchId, eventIds],
    queryFn: () => base44.entities.CateringAssignment.filter({ branch_id: selectedBranchId, event_id: { $in: eventIds } }, "-created_date", 1000),
    enabled: !!selectedBranchId && eventIds.length > 0,
  });

  const hasFilters = !!search.trim() || !!eventTypeFilter || !!locationTypeFilter;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap">
        <p className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
          {hasFilters ? `${totalCount} of ${windowTotal}` : totalCount} events
        </p>
        <EventsFilterBar
          eventTypes={eventTypes}
          eventType={eventTypeFilter}
          onEventTypeChange={setEventTypeFilter}
          locationType={locationTypeFilter}
          onLocationTypeChange={setLocationTypeFilter}
        />
        <div className="sm:flex-1">
          <EventDateRangeSelect
            value={dateRange}
            onChange={(nextRange) => {
              setDateRange(nextRange);
              if (sortBy !== "name") {
                setSortBy(nextRange === "past" || nextRange === "all" ? "date_desc" : "date_asc");
              }
            }}
          />
        </div>
        <div className="sm:flex-1"><EventSortSelect value={sortBy} onChange={setSortBy} /></div>
        <div className="relative sm:flex-[1.5]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all event details…"
            className="h-9 rounded-lg border-slate-200 bg-slate-50 pl-9 shadow-none focus:bg-white"
          />
        </div>
        <div className="flex shrink-0">
          {canEdit && (
            <Button size="sm" className="h-9 gap-1.5 rounded-r-none bg-gold text-white hover:bg-gold hover:brightness-95" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="w-4 h-4" /> New Event
            </Button>
          )}
          {quickActions && React.cloneElement(quickActions, { joined: canEdit })}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading events…</p>
      ) : windowTotal === 0 && !hasFilters ? (
        <Card className="p-8 text-center text-slate-500">
          {dateRange === "all" ? "No catering events yet. Book the first one." : "No events for these dates."}
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">No events match your search or filters.</Card>
      ) : (
        <>
          <motion.div
            key={`events-page-${page}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-3"
          >
            {filteredEvents.map((ev) => {
              const isSelected = ev.id === selectedEventId;
              const cutoffPassed = ev.guarantee_cutoff_date && daysUntil(ev.guarantee_cutoff_date) < 0;
              const eventTrips = trips.filter((t) => t.event_id === ev.id && t.stage !== "cancelled");
              const tripDiscrepancies = eventTrips.reduce((s, t) => s + (Number(t.discrepancy_count) || 0), 0);
              const service = serviceTotalsFrom({
                assignments: assignments.filter((a) => a.event_id === ev.id),
                trips: trips.filter((t) => t.event_id === ev.id),
              });
              return (
                <Card
                  key={ev.id}
                  onClick={() => onSelectEvent(ev.id)}
                  className={`p-4 flex flex-col cursor-pointer transition-shadow ${isSelected ? "ring-2 ring-warning-500" : "hover:shadow-md"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 truncate">{ev.event_name}</h3>
                        {isSelected && <Check className="w-4 h-4 text-warning-600" />}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{ev.client_name} · {ev.client_phone || "—"}</p>
                    </div>
                    <Badge className={STATUS_STYLES[ev.status] || "bg-slate-100 text-slate-700"}>{ev.status?.replace(/_/g, " ")}</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-slate-400" />{ev.event_date} {ev.start_time || ""}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{ev.location_type === "off_site" ? (ev.venue_name || "Off-site") : "On-site"}</span>
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-400" />{ev.expected_guests} expected · {ev.guaranteed_guests || 0} guaranteed{cutoffPassed ? " (locked)" : ""}</span>
                    <span>Quote: {formatCurrency(ev.quote_total || 0, true)}</span>
                    <span>Deposit due: {formatCurrency(ev.required_deposit_amount || 0, true)}</span>
                    <span>Paid: {formatCurrency(ev.total_paid || 0, true)}</span>
                  </div>

                  {["pending", "approved", "rejected"].includes(ev.policy_approval_status) && (
                    <div className="mt-2"><PolicyApprovalBadge event={ev} /></div>
                  )}

                  {eventRiskCountFromRecord(ev) > 0 && !["cancelled", "completed"].includes(ev.status) && (
                    <div className="mt-2">
                      <Badge className="bg-red-100 text-red-700 text-xs gap-1">
                        <AlertTriangle className="w-3 h-3" /> At risk — {eventRiskCountFromRecord(ev)} open issue(s)
                      </Badge>
                    </div>
                  )}

                  {staffingAlert(ev) && (
                    <div className="mt-2">
                      <Badge className="bg-red-100 text-red-700 text-xs">{staffingAlert(ev)}</Badge>
                    </div>
                  )}

                  {(ev.reservation_status === "shortfall" || ev.production_batch_count > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ev.reservation_status === "shortfall" && (
                        <Badge className="bg-red-100 text-red-700 text-xs">
                          {ev.reservation_shortfall_count} stock shortfall(s)
                        </Badge>
                      )}
                      {ev.production_batch_count > 0 && ev.production_plan_status === "planned" && (
                        <Badge variant="outline" className="text-xs">{ev.production_batch_count} production batch(es)</Badge>
                      )}
                    </div>
                  )}

                  {eventTrips.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {eventTrips.map((t) => (
                        <Badge key={t.id} variant="outline" className="text-xs gap-1">
                          <Truck className="w-3 h-3" />
                          {t.vehicle_name || "No vehicle"} · {t.driver_name || "No driver"} · {t.stage.replace(/_/g, " ")}
                        </Badge>
                      ))}
                      {tripDiscrepancies > 0 && (
                        <Badge className="bg-red-100 text-red-700 text-xs">{tripDiscrepancies} return discrepancy(ies)</Badge>
                      )}
                    </div>
                  )}

                  {(ev.event_type || ev.venue_setting || ev.service_style || ev.dress_code || ev.theme) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ev.event_type && <Badge variant="secondary" className="text-xs">{ev.event_type}</Badge>}
                      {ev.venue_setting && <Badge variant="outline" className="text-xs">{ev.venue_setting}</Badge>}
                      {ev.service_style && <Badge variant="outline" className="text-xs">{ev.service_style}</Badge>}
                      {ev.dress_code && <Badge variant="outline" className="text-xs">{ev.dress_code}</Badge>}
                      {ev.theme && <Badge variant="outline" className="text-xs">Theme: {ev.theme}</Badge>}
                    </div>
                  )}

                  {(ev.special_requests || []).length > 0 && (
                    <div className="mt-2 rounded-md border border-warning-200 bg-warning-50 p-2 space-y-0.5">
                      <p className="text-xs font-semibold text-warning-800 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Special requests ({ev.special_requests.length})
                      </p>
                      {ev.special_requests.slice(0, 3).map((r, i) => (
                        <p key={i} className="text-xs text-warning-800">
                          • [{r.category}] {r.detail}{r.kitchen_critical ? " — kitchen critical" : ""}
                        </p>
                      ))}
                    </div>
                  )}

                  {canEditRecord(ev) && <div className="mt-auto pt-3 flex items-center gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={(e) => { e.stopPropagation(); setEditing(ev); setShowForm(true); }}>
                      <Pencil className="w-3.5 h-3.5" /> Edit / Reschedule
                    </Button>
                    {ev.status !== "cancelled" && (
                      <Button size="sm" variant="ghost" className="gap-1.5 text-red-600 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setCancelling(ev); }}>
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="gap-1.5 text-red-600 hover:text-red-700 ml-auto" onClick={(e) => { e.stopPropagation(); setDeletingEvent(ev); }}>
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  </div>}
                </Card>
              );
            })}
          </motion.div>
          <EventsPaginationBar
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            currentCount={filteredEvents.length}
            totalCount={totalCount}
            hasPrevPage={hasPrevPage}
            hasNextPage={hasNextPage}
            isFetchingPage={isFetchingPage}
            onPrevPage={goToPrevPage}
            onNextPage={goToNextPage}
            onGoToPage={goToPage}
          />
        </>
      )}

      <EventFormDialog open={showForm} onOpenChange={setShowForm} event={editing} />
      <CancelEventDialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)} event={cancelling} />
      <DeleteEventDialog
        event={deletingEvent}
        open={!!deletingEvent}
        onOpenChange={(o) => !o && setDeletingEvent(null)}
        onDeleted={(id) => { if (id === selectedEventId) onSelectEvent(null); }}
      />
    </div>
  );
}