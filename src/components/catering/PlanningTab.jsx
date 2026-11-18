import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, Unlock } from "lucide-react";
import { toast } from "sonner";
import { useBranch } from "@/components/branches/BranchContext";
import EventScopeNotice from "./EventScopeNotice";
import { reserveForEvent, releaseForEvent } from "./productionPlanning";
import { StockPullsList, ProductionBatchList } from "./PlanningRequirementsList";
import ProcurementPanel from "./ProcurementPanel";
import EquipmentReservationsPanel from "./EquipmentReservationsPanel";
import GeneratePurchaseCartDialog from "./GeneratePurchaseCartDialog";
import ReservationApprovalCard from "./ReservationApprovalCard";
import UnplannedLinesWarning from "./UnplannedLinesWarning";
import { assertDepositCoversQuote } from "./cateringFinance";
import { findPlanningGaps, hasStockableRecipe } from "./planningGaps";
import ResolveUnplannedDialog from "./ResolveUnplannedDialog";
import RequisitionPanel from "./requisition/RequisitionPanel";

import { useCateringEditAccess } from "./useCateringEditAccess";
import { isBatchSlip } from "./releaseSlipMeta";

export default function PlanningTab({ event }) {
  const { canEditRecord } = useCateringEditAccess();
  const canWrite = canEditRecord(event);
  const queryClient = useQueryClient();
  const { selectedBranch } = useBranch();
  const [working, setWorking] = useState(false);
  const [resolve, setResolve] = useState(null);

  const { data: reservations = [] } = useQuery({
    queryKey: ["catering-reservations", event?.id],
    queryFn: () => base44.entities.CateringReservation.filter({ event_id: event.id, status: "reserved" }),
    enabled: !!event?.id,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["catering-production", event?.id],
    queryFn: () => base44.entities.ProductionOrder.filter({ catering_event_id: event.id }),
    enabled: !!event?.id,
  });

  const { data: releaseSlips = [], isLoading: slipsLoading } = useQuery({
    queryKey: ["kitchen-release-slips", event?.branch_id, event?.id],
    queryFn: () => base44.entities.KitchenReleaseSlip.filter({ event_id: event.id }),
    enabled: !!event?.id,
  });

  if (!event) return <EventScopeNotice />;

  const guests = Number(event.guarantee_locked ? event.guaranteed_guests : event.expected_guests) || 0;
  const activeOrders = orders.filter((o) => o.status !== "cancelled");
  const legacySlip = releaseSlips.find((s) => !isBatchSlip(s));
  const batchSlipCount = releaseSlips.filter((s) => isBatchSlip(s) && s.status === "scheduled").length;
  const shortfalls = reservations.filter((r) => r.shortfall_quantity > 0);

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catering-reservations"] }),
      queryClient.invalidateQueries({ queryKey: ["catering-production"] }),
      queryClient.invalidateQueries({ queryKey: ["catering-events"] }),
      queryClient.invalidateQueries({ queryKey: ["kitchen-release-slips"] }),
      queryClient.invalidateQueries({ queryKey: ["event-requisition"] }),
      queryClient.invalidateQueries({ queryKey: ["requisition-flow"] }),
    ]);

  const runPlan = async () => {
    if (!event.active_quote_id) return toast.error("This event needs an active quote first");
    setWorking(true);
    try {
      const [quote, user] = await Promise.all([
        base44.entities.CateringQuote.get(event.active_quote_id),
        base44.auth.me(),
      ]);
      await assertDepositCoversQuote({ eventId: event.id, quote });
      const menuItems = await base44.entities.MenuItem.list("-created_date", 500);
      const gaps = findPlanningGaps(quote, menuItems);
      const anyPlannable = (quote.line_items || []).some((li) => (Number(li.quantity) || 0) > 0 && !li.manually_sourced && li.menu_item_id && hasStockableRecipe(menuItems.find((m) => m.id === li.menu_item_id)));
      if (!anyPlannable && gaps.length) {
        setResolve({ quote, gaps, menuItems });
        return;
      }
      const res = await reserveForEvent({ event, quote, branch: selectedBranch, userEmail: user?.email });

      // Shortfalls are only flagged here — ordering goes through the Shortfall Queue / Recommended Cart.
      await refresh();
      const skipped = res.requirements.unmapped;
      const added = res.addedItems || [];
      const skippedNote =
        (skipped.length ? ` Skipped (no recipe): ${skipped.map((u) => u.name).join(", ")}.` : "") +
        (added.length ? ` Added ${added.length} item(s) ${event.branch_name || "this branch"} didn't stock to its stock list, with none on hand yet.` : "");
      if (res.rows.length === 0) toast.error(`Nothing to reserve — no quote line is linked to a recipe.${skippedNote}`, { duration: 8000 });
      else if (res.shortfalls.length) toast.error(`Planned with ${res.shortfalls.length} stock shortfall(s).${skippedNote}`, { duration: 8000 });
      else toast.success(`Reserved ${res.rows.length} item(s) · ${res.batches.length} production batch(es).${skippedNote}`, { duration: skippedNote ? 8000 : 4000 });
    } catch (e) {
      if (e?.name === "DepositNotCoveredError") {
        await refresh();
        toast.error(e.message, { duration: 8000 });
      } else if (e?.name === "RequisitionLockedError" || e?.name === "StockFlowError") toast.error(e.message, { duration: 8000 });
      else toast.error("Could not build the production plan");
    } finally {
      setWorking(false);
    }
  };

  const release = async () => {
    setWorking(true);
    try {
      const user = await base44.auth.me();
      const res = await releaseForEvent({ event, userEmail: user?.email, reason: "Manual release — manager review" });
      await refresh();
      toast.success(`Released ${res.releasedReservations} reservation(s), cancelled unstarted batches`);
    } catch {
      toast.error("Could not release the reservations");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      {resolve && (
        <ResolveUnplannedDialog
          open
          onOpenChange={(o) => !o && setResolve(null)}
          quote={resolve.quote}
          gaps={resolve.gaps}
          menuItems={resolve.menuItems}
          onResolved={() => { setResolve(null); queryClient.invalidateQueries({ queryKey: ["catering-unplanned-lines"] }); queryClient.invalidateQueries({ queryKey: ["catering-quotes"] }); }}
        />
      )}
      <UnplannedLinesWarning event={event} />

      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">{event.event_name} · {guests} guests{event.guarantee_locked ? " (guaranteed)" : ""}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <Badge variant="outline" className="text-xs">Reservations: {event.reservation_status || "none"}</Badge>
            <Badge variant="outline" className="text-xs">Production: {event.production_plan_status || "none"}</Badge>
            <Badge variant="outline" className="text-xs">Procurement: {event.procurement_status || "none"}</Badge>
            {legacySlip && <Badge className={legacySlip.status === "fulfilled" ? "bg-emerald-100 text-emerald-800" : legacySlip.status === "void" ? "bg-slate-200 text-slate-700" : "bg-warning-100 text-warning-800"}>Release slip: {legacySlip.status}</Badge>}
            {batchSlipCount > 0 && <Badge className="bg-sky-100 text-sky-800">Requisition batches: {batchSlipCount} scheduled</Badge>}
            {event.reservation_last_run && (
              <Badge variant="outline" className="text-xs">Last run {new Date(event.reservation_last_run).toLocaleString()}</Badge>
            )}
          </div>
        </div>
        {canWrite && <div className="flex flex-wrap gap-2">
          <GeneratePurchaseCartDialog event={event} />
          <Button variant="outline" className="gap-1.5" onClick={release} disabled={working || !reservations.length}>
            <Unlock className="w-4 h-4" /> Release
          </Button>
          <Button className="gap-1.5" onClick={runPlan} disabled={working || event.status === "cancelled"}>
            <RefreshCw className="w-4 h-4" /> {reservations.length ? "Recalculate plan" : "Generate plan & reserve"}
          </Button>
        </div>}
      </Card>

      {event.deposit_status !== "paid" && !reservations.length && (
        <p className="text-xs text-slate-500">
          Once the deposit is fully received the reservation is queued for a Catering Manager/owner to approve — stock is
          committed on approval. Planning here also requires the active quote's deposit to be covered.
        </p>
      )}

      {shortfalls.length > 0 && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> {shortfalls.length} shortfall(s) — not enough free stock
          </p>
          <div className="mt-2 space-y-0.5">
            {shortfalls.map((r) => (
              <p key={r.id} className="text-xs text-red-700">
                • {r.inventory_item_name}: need {r.quantity_reserved} {r.unit}, free {r.available_at_reservation} — short {r.shortfall_quantity}
                {r.purpose === "production_input" ? ` (input for ${r.produced_item_name})` : ""}
              </p>
            ))}
          </div>
          <p className="text-xs text-red-700 mt-2">Use "Order missing items" above to build a recommended cart in Purchases.</p>
        </Card>
      )}

      <ProcurementPanel event={event} reservations={reservations} />

      <EquipmentReservationsPanel event={event} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <StockPullsList reservations={reservations} />
        <ProductionBatchList orders={activeOrders} reservations={reservations} />
      </div>

      {!slipsLoading && <RequisitionPanel event={event} />}
    </div>
  );
}