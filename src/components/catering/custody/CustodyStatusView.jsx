import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, Circle, CheckCircle2 } from "lucide-react";
import { CUSTODY_STAGES, CUSTODY_LABELS, confirmerLabel } from "./custodyMeta";
import CustodyConfirmDialog from "./CustodyConfirmDialog";
import CustodyAssignDialog from "./CustodyAssignDialog";

export default function CustodyStatusView({ trip, canAssign = true }) {
  const queryClient = useQueryClient();
  const [confirmStage, setConfirmStage] = useState(null);
  const [mode, setMode] = useState("confirm");
  const [assignOpen, setAssignOpen] = useState(false);

  const { data: checkpoints = [] } = useQuery({
    queryKey: ["custody-checkpoints", trip.id],
    queryFn: () => base44.entities.CateringCustodyCheckpoint.filter({ trip_id: trip.id }),
  });

  const byStage = Object.fromEntries(checkpoints.map((c) => [c.stage, c]));
  // Some viewers can only read their own checkpoints, so the trip's confirmed-stage list fills the gaps.
  const confirmed = new Set([...(trip.custody_confirmed_stages || []), ...Object.keys(byStage)]);
  const nextStage = CUSTODY_STAGES.find((s) => !confirmed.has(s));
  const canConfirm = trip.stage !== "cancelled" && nextStage;

  const onDone = () => {
    queryClient.invalidateQueries({ queryKey: ["custody-checkpoints"] });
    queryClient.invalidateQueries({ queryKey: ["custody-checkpoints-event"] });
    queryClient.invalidateQueries({ queryKey: ["catering-trips"] });
    queryClient.invalidateQueries({ queryKey: ["catering-trips-all"] });
  };

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50">
        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-500" /> Chain of custody · {confirmed.size}/{CUSTODY_STAGES.length} confirmed
        </p>
        <span className="flex items-center gap-1.5">
          {canAssign && trip.stage !== "cancelled" && (
            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setAssignOpen(true)}>
              Assign people
            </Button>
          )}
          {canConfirm && (
            <>
              <Button size="sm" className="h-6 text-xs" onClick={() => { setMode("confirm"); setConfirmStage(nextStage); }}>
                Confirm: {CUSTODY_LABELS[nextStage]}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => { setMode("issue"); setConfirmStage(nextStage); }}
              >
                Report issue
              </Button>
            </>
          )}
        </span>
      </div>
      <div className="divide-y">
        {CUSTODY_STAGES.map((s) => {
          const cp = byStage[s];
          const shortage = cp?.status === "shortage";
          return (
            <div key={s} className="px-3 py-1.5 text-xs">
            <div className="flex items-center gap-2">
              {!cp ? (
                <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              ) : shortage ? (
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              )}
              <span className={`min-w-0 truncate ${cp ? "text-slate-800" : "text-slate-400"}`}>{CUSTODY_LABELS[s]}</span>
              <span className="ml-auto flex items-center gap-1.5 shrink-0 text-slate-500">
                {cp ? (
                  <span className="hidden sm:inline">
                    Confirmed by: {cp.reported_by_name} at {new Date(cp.confirmed_at).toLocaleString()}
                  </span>
                ) : confirmed.has(s) ? null : (
                  <span className="hidden sm:inline text-amber-700">Expected: {confirmerLabel(s, trip)}</span>
                )}
                {!cp && confirmed.has(s) ? (
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">confirmed</Badge>
                ) : !cp ? (
                  <Badge variant="outline" className="text-xs">pending</Badge>
                ) : shortage ? (
                  <Badge className="bg-red-100 text-red-700 text-xs">shortage</Badge>
                ) : (
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">confirmed</Badge>
                )}
              </span>
            </div>
            {cp && (cp.discrepancy_notes || cp.photo_url) && (
              <div className="mt-1 ml-5 rounded bg-amber-50 border border-amber-200 p-2 space-y-1">
                {cp.discrepancy_notes && <p className="text-amber-900">{cp.discrepancy_notes}</p>}
                {cp.photo_url && (
                  <a href={cp.photo_url} target="_blank" rel="noopener noreferrer">
                    <img src={cp.photo_url} alt="Reported issue" className="h-24 rounded border" />
                  </a>
                )}
              </div>
            )}
            </div>
          );
        })}
      </div>

      <CustodyConfirmDialog
        open={!!confirmStage}
        onOpenChange={(o) => !o && setConfirmStage(null)}
        trip={trip}
        stage={confirmStage}
        issueMode={mode === "issue"}
        onDone={onDone}
      />
      <CustodyAssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        trip={trip}
        onDone={onDone}
      />
    </div>
  );
}