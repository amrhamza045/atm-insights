import { useState } from "react";
import { Button } from "@/components/ui/button";
import InsufficientSources from "./InsufficientSources";
import LossOverviewStep from "./LossOverviewStep";
import LossTripNav from "./LossTripNav";
import MarginWaterfall from "./MarginWaterfall";
import NarrativeActionsStep from "./NarrativeActionsStep";
import RootCauseStep from "./RootCauseStep";
import PostEventVariance from "./variance/PostEventVariance";

export default function LossTrip({ event, run, quote }) {
  const [step, setStep] = useState(0);
  if (!event) return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-slate-400">Select an event to open its Loss Analysis trip.</div>;
  const variance = <PostEventVariance event={event} run={run} quote={quote} />;
  if (event.loss_analysis_status === "insufficient_data" || !run?.margin_bridge_lines?.length) return <div className="space-y-6"><InsufficientSources run={run} />{event.status === "completed" && variance}</div>;
  const views = [<LossOverviewStep event={event} run={run} quote={quote} />, <MarginWaterfall run={run} />, <RootCauseStep run={run} />, <NarrativeActionsStep event={event} run={run} quote={quote} />, variance];
  return (
    <div className="space-y-4">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Selected event</p><h2 className="text-xl font-bold text-slate-900">{event.event_name}</h2></div>
      <LossTripNav step={step} onChange={setStep} />
      <div className="min-h-[320px] rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6">{views[step]}</div>
      <div className="flex justify-between"><Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>Previous</Button><Button disabled={step === 4} onClick={() => setStep(step + 1)}>Next</Button></div>
    </div>
  );
}