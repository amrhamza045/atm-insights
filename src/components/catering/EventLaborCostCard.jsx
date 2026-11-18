import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Coins, Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import LaborCostRoleTable from "./LaborCostRoleTable";
import { getStaffingRoles } from "./staffing";
import { computeLaborCost, lockLaborCost, syncLiveLaborCost, isLockingStatus } from "./laborCost";

/** This event's labor cost, calculated from the predefined role rates and its own assignments. */
export default function EventLaborCostCard({ event }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: roles = [] } = useQuery({ queryKey: ["catering-staffing-roles"], queryFn: getStaffingRoles });

  const { data: assignments = [] } = useQuery({
    queryKey: ["catering-assignments", event?.id],
    queryFn: () => base44.entities.CateringAssignment.filter({ event_id: event.id, status: "confirmed" }),
    enabled: !!event?.id,
  });

  const calc = useMemo(
    () => (event ? computeLaborCost({ event, roles, assignments }) : null),
    [event, roles, assignments]
  );

  const locked = !!event?.labor_cost_locked;

  useEffect(() => {
    if (!event || !calc) return;
    (async () => {
      if (locked) return;
      if (isLockingStatus(event.status)) {
        const user = await base44.auth.me();
        await lockLaborCost({ event, calc, userEmail: user?.email });
      } else {
        await syncLiveLaborCost({ event, calc });
      }
      queryClient.invalidateQueries({ queryKey: ["catering-events"] });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, event?.status, calc?.total, locked]);

  if (!event || !calc) return null;

  const shown = locked ? Number(event.estimated_labor_cost) || 0 : calc.total;
  const margin = (Number(event.quote_total) || 0) - shown;

  const relock = async () => {
    setBusy(true);
    try {
      const user = await base44.auth.me();
      await lockLaborCost({ event, calc, userEmail: user?.email });
      await queryClient.invalidateQueries({ queryKey: ["catering-events"] });
      toast.success("Labor cost re-frozen at today's rates");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Coins className="w-4 h-4 text-slate-400" /> Labor cost for this event
            <Badge variant="outline" className="text-xs font-normal flex items-center gap-1">
              {locked ? <><Lock className="w-3 h-3" /> locked</> : "live"}
            </Badge>
          </h3>
          {locked && (
            <Button size="sm" variant="outline" disabled={busy} onClick={relock}>
              Re-freeze at current rates
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Total labor cost</p>
            <p className="font-semibold text-amber-700">{formatCurrency(shown)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Not yet staffed (indicative)</p>
            <p className="font-semibold text-slate-500">
              {calc.unfilledSlots > 0 ? `${formatCurrency(calc.unstaffedEstimate)} · ${calc.unfilledSlots} slot(s)` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Quote total</p>
            <p className="font-semibold text-slate-900">{calc.quoteTotal > 0 ? formatCurrency(calc.quoteTotal) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Margin after labor</p>
            <p className={`font-semibold ${margin < 0 ? "text-red-600" : "text-emerald-600"}`}>
              {calc.quoteTotal > 0 ? `${formatCurrency(margin)} · ${calc.marginPercentage}%` : "—"}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Hourly roles are costed over {calc.hours} h (event duration plus one hour setup and one hour breakdown). Only
          assigned people are charged to the event — suggested roles with nobody assigned are shown separately as an
          indicative figure at the predefined role rate and are not added to the cost or the margin. Assign the people to
          see the cost move.
        </p>

        {calc.rolesMissingRate.length > 0 && (
          <p className="text-xs text-amber-700 flex items-start gap-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            No rate on record for: {calc.rolesMissingRate.join(", ")} — set a predefined rate in Operations › Assets and Resources › Staffing, or
            enter a rate when assigning freelance staff.
          </p>
        )}
      </Card>

      <LaborCostRoleTable
        rows={locked ? null : calc.rows}
        snapshot={locked ? event.labor_cost_breakdown || [] : null}
        roles={roles}
      />
    </div>
  );
}