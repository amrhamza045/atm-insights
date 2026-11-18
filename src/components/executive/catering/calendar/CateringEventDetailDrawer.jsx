import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { eventTypeLabel, eventTypeColor, isCancelled } from "./calendarEventStyle";
import ConflictSection from "./ConflictSection";

function Row({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-medium text-slate-800 text-right">{value}</span>
    </div>
  );
}

// Read-only event detail — v1 never mutates the event.
export default function CateringEventDetailDrawer({
  event,
  quoteById,
  open,
  onOpenChange,
  conflict = null,
  onJumpToEvent,
}) {
  if (!event) return null;
  const { category, packageName } = eventTypeLabel(event, quoteById);
  const time = [event.start_time, event.end_time].filter(Boolean).join(" – ");
  // Cancelled events don't surface conflicts — consistent with their chip.
  const groups = !isCancelled(event) && conflict?.count ? conflict.groups : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className={`text-base pr-6 ${isCancelled(event) ? "line-through text-slate-400" : ""}`}>
            {event.event_name || "Untitled event"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px] capitalize">
              {String(event.status || "").replace(/_/g, " ")}
            </Badge>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: eventTypeColor(event, quoteById) }}
            >
              {category}
            </span>
          </div>

          {groups && (
            <div className="space-y-2.5 rounded-md border border-slate-200 p-2.5">
              <p className="text-xs font-semibold text-slate-900">
                Conflicts ({conflict.count})
              </p>
              {/* Ordered most-blocking first: venue → staff → equipment. */}
              <ConflictSection type="venue" items={groups.venue} onJumpToEvent={onJumpToEvent} />
              <ConflictSection type="staff" items={groups.staff} onJumpToEvent={onJumpToEvent} />
              <ConflictSection type="equipment" items={groups.equipment} onJumpToEvent={onJumpToEvent} />
            </div>
          )}

          <div>
            <Row label="Date" value={event.event_date} />
            <Row label="Time" value={time} />
            <Row label="Event type" value={event.event_type} />
            <Row label="Package" value={packageName} />
            <Row label="Client" value={event.client_name} />
            <Row label="Venue" value={event.location_type === "off_site" ? "Off-site" : "On-site"} />
            <Row label="Venue name" value={event.venue_name} />
            <Row label="Expected guests" value={event.expected_guests || 0} />
            <Row
              label="Guaranteed guests"
              value={event.guaranteed_guests ? event.guaranteed_guests : null}
            />
            <Row
              label="Staffing"
              value={`${event.staffing_assigned_count || 0}/${event.staffing_required_count || 0}`}
            />
            <Row label="Quote total" value={formatCurrency(event.quote_total)} />
            <Row label="Balance due" value={formatCurrency(event.balance_due)} />
            <Row label="Branch" value={event.branch_name} />
          </div>

          {event.notes && (
            <div className="pt-1">
              <p className="text-xs text-slate-500 mb-1">Notes</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{event.notes}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}