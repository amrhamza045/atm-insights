import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import moment from "moment";
import { formatCurrency } from "@/components/utils/currencyFormatter";

const Row = ({ label, value }) => (
  <div className="border-b pb-2">
    <p className="text-slate-500 text-xs">{label}</p>
    <p className="font-medium break-words">{value || "N/A"}</p>
  </div>
);

/** Read-only summary of a catering event queued for reservation approval. */
export default function CateringEventDetailsDialog({ event, open, onOpenChange }) {
  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event.event_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{event.status}</Badge>
            <Badge variant="outline">Reservation: {event.reservation_status}</Badge>
            <Badge variant="outline">Deposit: {event.deposit_status}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Row label="Event code" value={event.event_code} />
            <Row label="Event type" value={event.event_type} />
            <Row label="Client" value={event.client_name} />
            <Row label="Client phone" value={event.client_phone} />
            <Row label="Event date" value={event.event_date ? moment(event.event_date).format("DD MMM YYYY") : null} />
            <Row label="Time" value={[event.start_time, event.end_time].filter(Boolean).join(" – ")} />
            <Row label="Expected guests" value={event.expected_guests} />
            <Row label="Guaranteed guests" value={event.guaranteed_guests} />
            <Row label="Location" value={event.location_type === "off_site" ? "Off site" : "On site"} />
            <Row label="Venue" value={event.venue_name} />
            <Row label="Venue address" value={event.venue_address} />
            <Row label="Branch" value={event.branch_name} />
            <Row label="Service style" value={event.service_style} />
            <Row label="Theme" value={event.theme} />
            <Row label="On-site contact" value={event.onsite_contact_name} />
            <Row label="On-site phone" value={event.onsite_contact_phone} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm bg-slate-50 border rounded-lg p-4">
            <Row label="Quote total" value={formatCurrency(event.quote_total, true)} />
            <Row label="Required deposit" value={formatCurrency(event.required_deposit_amount, true)} />
            <Row label="Total paid" value={formatCurrency(event.total_paid, true)} />
            <Row label="Balance due" value={formatCurrency(event.balance_due, true)} />
          </div>

          {event.special_requests?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 text-sm">Special requests</h3>
              <ul className="space-y-1 text-sm text-slate-700 list-disc pl-5">
                {event.special_requests.map((r, i) => (
                  <li key={i}>
                    <span className="capitalize">{r.category}</span>: {r.detail}
                    {r.kitchen_critical ? " (kitchen critical)" : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <Row label="Requested by" value={event.reservation_requested_by} />
            <Row
              label="Requested on"
              value={event.reservation_requested_date ? moment(event.reservation_requested_date).format("DD MMM YYYY HH:mm") : null}
            />
          </div>

          {event.notes && (
            <div className="bg-slate-50 border rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{event.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}