import React from "react";
import { ListChecks, MousePointerClick } from "lucide-react";
import FlowCrossLinks from "./FlowCrossLinks";

export default function FlowDetailPanel({ step, number, onJump }) {
  const items = step.detail === "full" ? step.procedure : step.detail === "substeps" ? step.substeps : [];
  return (
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-center gap-2 text-amber-800 mb-2"><MousePointerClick className="w-4 h-4" /><span className="text-xs font-semibold uppercase tracking-wide">Selected step {number}</span></div>
      <h3 className="font-bold text-slate-900">{step.title}</h3>
      <p className="text-sm leading-6 text-slate-700 mt-2">{step.summary}</p>
      {!!items?.length && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-white/70 p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600 mb-3"><ListChecks className="w-4 h-4" />{step.detail === "full" ? "Procedure" : "Actions"}</p>
          <ol className="space-y-2">{items.map((item, index) => <li key={item} className="flex gap-3 text-sm text-slate-700"><span className="font-bold text-amber-700">{index + 1}.</span><span>{item}</span></li>)}</ol>
        </div>
      )}
      <p className="text-sm font-medium text-amber-800 mt-4">Outcome: {step.outcome}</p>
      <FlowCrossLinks links={step.crossFlows} onJump={onJump} />
    </div>
  );
}