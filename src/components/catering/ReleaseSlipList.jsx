import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, AlertTriangle } from "lucide-react";
import { getReleaseSlipMeta, batchLabel } from "./releaseSlipMeta";
import ReleaseSlipPdfButton from "./ReleaseSlipPdfButton";

export default function ReleaseSlipList({ slips, loading, onOpen }) {
  if (loading) return <Card className="p-10 text-center text-sm text-slate-500">Loading release slips…</Card>;
  if (!slips.length) return <Card className="p-10 text-center text-slate-500"><ClipboardList className="w-10 h-10 mx-auto mb-2 text-slate-300" /><p className="text-sm">No release slips match these filters.</p></Card>;
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{slips.map((slip) => {
    const meta = getReleaseSlipMeta(slip.status);
    return <Card key={slip.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onOpen(slip)}>
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-semibold text-slate-900 truncate">{slip.event_name}</p><p className="text-xs text-slate-500">{slip.slip_number} · Needed {slip.needed_by_date || slip.event_date}</p>{batchLabel(slip) && <p className="text-xs font-medium text-sky-800">{batchLabel(slip)}</p>}</div><div className="flex items-center gap-2"><ReleaseSlipPdfButton slip={slip} /><Badge className={meta.className}>{meta.label}</Badge></div></div>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-600"><span>{slip.lines?.length || 0} material line(s)</span>{slip.shortfall_count > 0 && <Badge className="bg-red-100 text-red-700 gap-1"><AlertTriangle className="w-3 h-3" />{slip.shortfall_count} shortfall(s)</Badge>}</div>
      {slip.fulfilled_by && <p className="mt-2 text-xs text-slate-500">Fulfilled by {slip.fulfilled_by} · {new Date(slip.fulfilled_date).toLocaleString()}</p>}
      {slip.void_reason && <p className="mt-2 text-xs text-slate-500">Void: {slip.void_reason}</p>}
    </Card>;
  })}</div>;
}