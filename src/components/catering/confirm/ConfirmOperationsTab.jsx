import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Rocket, User, Phone, Users } from "lucide-react";
import { toast } from "sonner";
import ConfirmQuoteSummary from "./ConfirmQuoteSummary";
import ConfirmationSummary from "./ConfirmationSummary";
import { billableGuests } from "./confirmOperations";
import { autoStartOperations, OPERATIONS_QUERY_KEYS } from "./autoStartOperations";

const DONE_STATUSES = ["in_progress", "completed"];

export default function ConfirmOperationsTab({ event, onGoToTab }) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const autoTried = useRef(false);

  const { data: quote, isLoading: quoteLoading } = useQuery({
    queryKey: ["confirm-active-quote", event?.id, event?.active_quote_id],
    queryFn: async () => {
      if (event?.active_quote_id) return base44.entities.CateringQuote.get(event.active_quote_id).catch(() => null);
      const rows = await base44.entities.CateringQuote.filter({ event_id: event.id });
      return rows.find((q) => q.status === "active" || q.status === "accepted") || null;
    },
    enabled: !!event?.id,
  });

  // Already-started events rebuild their readout from the reservations on record.
  const alreadyStarted = DONE_STATUSES.includes(event?.status);
  const { data: priorResult } = useQuery({
    queryKey: ["confirm-prior-result", event?.id],
    queryFn: async () => {
      const [rows, catalog] = await Promise.all([
        base44.entities.CateringEquipmentReservation.filter({ event_id: event.id }),
        base44.entities.CateringEquipment.list("name", 500),
      ]);
      const live = rows.filter((r) => r.status !== "released");
      const withVehicle = live.filter(
        (r) => ["reserved", "requested"].includes(r.status) && catalog.find((e) => e.id === r.equipment_id)?.requires_vehicle
      );
      return {
        equipmentPlanned: live.length > 0,
        reason: "no_requirements",
        reservations: live,
        transportNeeded: withVehicle,
      };
    },
    enabled: !!event?.id && alreadyStarted,
  });

  // Auto-start once when a confirmed event is opened (covers approvals made elsewhere).
  useEffect(() => {
    if (autoTried.current || !quote || event?.status !== "confirmed") return;
    autoTried.current = true;
    start();
  }, [quote, event?.status]);

  if (!event) return <Blocked title="No event selected" detail="Pick an event in the Events tab to confirm it into operations." />;

  if (!alreadyStarted && event.status !== "confirmed") {
    return (
      <Blocked
        title="Event must be confirmed — deposit verification pending"
        detail="Operations can only start once the deposit has been verified and recorded in the Deposits & Payments tab."
        status={event.status}
      />
    );
  }

  const summary = result || priorResult;
  if (alreadyStarted) {
    return summary ? (
      <ConfirmationSummary event={event} result={summary} onGoToTab={onGoToTab} />
    ) : (
      <p className="text-sm text-slate-500">Loading the confirmation summary…</p>
    );
  }

  const guests = billableGuests(event);

  const start = async () => {
    if (!quote) return toast.error("This event has no active quote to lock.");
    setBusy(true);
    setFailure("");
    try {
      const res = await autoStartOperations(event.id);
      if (!res) return setFailure("The deposit is not fully covered yet, so operations cannot start.");
      setResult(res);
      await Promise.all(OPERATIONS_QUERY_KEYS.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success("Operations started — the quote is locked and the event is in progress.");
    } catch (e) {
      await queryClient.invalidateQueries({ queryKey: ["catering-events"] });
      setFailure(e?.message || "Could not start operations.");
    } finally {
      setBusy(false);
    }
  };

  if (failure) {
    return (
      <div className="space-y-3">
        <Blocked title="Operations could not start automatically" detail={failure} />
        <Button onClick={start} disabled={busy} className="w-full gap-2">
          <Rocket className="w-4 h-4" />
          {busy ? "Retrying…" : "Retry starting operations"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Client</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5 text-slate-900 font-medium">
            <User className="w-4 h-4 text-slate-400" />
            {event.client_name || "—"}
          </span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <Phone className="w-4 h-4 text-slate-400" />
            {event.client_phone || "No phone on record"}
          </span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <Users className="w-4 h-4 text-slate-400" />
            {guests} billable guest(s)
            {event.guarantee_locked && <Badge className="bg-slate-100 text-slate-700">guarantee locked</Badge>}
          </span>
        </CardContent>
      </Card>

      {quoteLoading ? (
        <p className="text-sm text-slate-500">Loading the approved quote…</p>
      ) : quote ? (
        <ConfirmQuoteSummary quote={quote} />
      ) : (
        <Blocked title="No active quote" detail="Create and get a quote approved in the Quotes tab before starting operations." />
      )}

      <p className="text-sm text-slate-600 text-center flex items-center justify-center gap-2">
        <Rocket className="w-4 h-4 text-emerald-600" />
        {quote ? "Starting operations automatically — locking the quote, reserving equipment and allocating materials…" : "Waiting for an active quote."}
      </p>
    </div>
  );
}

function Blocked({ title, detail, status }) {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-amber-900">{title}</p>
        <p className="text-sm text-amber-800 mt-1">{detail}</p>
        {status && (
          <Badge className="mt-2 bg-amber-100 text-amber-800">Current status: {String(status).replace(/_/g, " ")}</Badge>
        )}
      </div>
    </div>
  );
}