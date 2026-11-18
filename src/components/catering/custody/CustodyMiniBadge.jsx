import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ShieldCheck } from "lucide-react";
import { CUSTODY_STAGES, CUSTODY_LABELS } from "./custodyMeta";

// Read-only chain summary for the Logistics trip card.
// All custody actions live on the Equipment tab.
export default function CustodyMiniBadge({ trip }) {
  const { data: checkpoints = [] } = useQuery({
    queryKey: ["custody-checkpoints", trip.id],
    queryFn: () => base44.entities.CateringCustodyCheckpoint.filter({ trip_id: trip.id }),
  });

  const done = new Set(checkpoints.map((c) => c.stage));
  const next = CUSTODY_STAGES.find((s) => !done.has(s));
  const shortages = checkpoints.filter((c) => c.status === "reported_shortage").length;

  return (
    <div className="rounded-lg border bg-slate-50 px-3 py-2 text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
      <span className="font-medium text-slate-700">Chain of custody · {done.size}/{CUSTODY_STAGES.length} confirmed</span>
      {next ? <span>· next: {CUSTODY_LABELS[next]}</span> : <span className="text-emerald-700">· chain complete</span>}
      {shortages > 0 && <span className="text-red-600">· {shortages} shortage(s)</span>}
      <span className="text-slate-400">— confirm and assign on the Equipment tab</span>
    </div>
  );
}