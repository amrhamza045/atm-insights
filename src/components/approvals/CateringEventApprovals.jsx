import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import moment from "moment";
import ReservationApprovalCard from "@/components/catering/ReservationApprovalCard";
import CateringEventDetailsDialog from "./CateringEventDetailsDialog";

/**
 * Catering event reservations queued for manager approval, surfaced inside the
 * Operations → Approvals centre. Approval logic lives in ReservationApprovalCard
 * so behaviour stays identical to the Catering module.
 */
export default function CateringEventApprovals({ events = [] }) {
  const [viewing, setViewing] = useState(null);

  if (events.length === 0) return null;

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <Card key={event.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">{event.event_name}</p>
              <p className="text-sm text-slate-500 truncate">
                {event.client_name} · {moment(event.event_date).format("DD MMM YYYY")} ·{" "}
                {event.expected_guests || 0} guests
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/Catering">Open in Catering</Link>
            </Button>
          </div>
          <ReservationApprovalCard event={event} standardActions onDetails={setViewing} />
        </Card>
      ))}

      <CateringEventDetailsDialog
        event={viewing}
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
      />
    </div>
  );
}