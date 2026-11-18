import { useState } from "react";
import LossReviewDialog from "@/components/executive/catering/LossReviewDialog";
import { ArrowRight } from "lucide-react";
import { actionFor, narrativeSentence, rankedLines } from "./lossAnalysisLogic";

export default function NarrativeActionsStep({ event, run, quote }) {
  const [selection, setSelection] = useState(null);
  const lines = rankedLines(run);
  const actions = lines.map((line) => ({ line, action: actionFor(line, event, quote) })).filter((item) => item.action);
  return (
    <div className="space-y-4">
      <div><h3 className="text-lg font-bold text-slate-900">Narrative and actions</h3><p className="text-sm text-slate-500">Generated from stored, nonzero factors in ranked order.</p></div>
      <div className="rounded-xl border bg-white p-4"><p className="leading-7 text-slate-700">{lines.map(narrativeSentence).filter(Boolean).join(" ") || "No nonzero margin factors were recorded."}</p></div>
      <div className="space-y-2">
        {actions.map(({ line, action }) => (
          <button key={line.key} type="button" onClick={() => setSelection({ line, action })} aria-haspopup="dialog" className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left text-sm font-semibold text-slate-800 hover:border-amber-300 hover:bg-amber-50">
            <span>{action.label}</span><ArrowRight className="w-4 h-4" />
          </button>
        ))}
      </div>
      {selection && <LossReviewDialog key={`${event.id}-${selection.line.key}`} selection={selection} event={event} quote={quote} onClose={() => setSelection(null)} />}
    </div>
  );
}