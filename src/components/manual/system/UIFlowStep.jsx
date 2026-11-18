import React from "react";
import { Check } from "lucide-react";
import FlowBranchConnector from "./FlowBranchConnector";
import FlowCrossLinks from "./FlowCrossLinks";

const normalize = (value) => Array.isArray(value)
  ? { type: "step", title: value[0], summary: value[1], outcome: value[2] }
  : value;

export default function UIFlowStep({ step: rawStep, number, active, onClick, onJump, onBranch, last }) {
  const step = normalize(rawStep);
  const decision = step.type === "decision";
  const card = decision
    ? "w-48 h-48 rotate-45 rounded-3xl border-violet-400 bg-violet-50"
    : "w-60 min-h-48 rounded-xl border-slate-200 bg-white hover:border-amber-300";
  return (
    <div className="flex items-center shrink-0 py-10">
      <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(event) => event.key === "Enter" && onClick()} aria-pressed={active} className={`${card} border p-4 text-left transition-colors cursor-pointer ${active ? "ring-2 ring-amber-500 shadow-md" : ""}`}>
        <div className={decision ? "-rotate-45 h-full flex flex-col justify-center px-2" : ""}>
          <div className="flex items-center justify-between mb-3">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${decision ? "bg-violet-600 text-white" : active ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600"}`}>{number}</span>
            {active && <Check className={`w-4 h-4 ${decision ? "text-violet-700" : "text-amber-700"}`} />}
          </div>
          <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${decision ? "text-violet-700" : "text-amber-700"}`}>{decision ? "Decision" : "Step"}</p>
          <h3 className="font-semibold text-slate-900 mb-2 leading-tight">{step.title}</h3>
          {!decision && <p className="text-sm line-clamp-3 text-slate-600">{step.summary}</p>}
          {!decision && <p className="mt-2 text-xs font-medium text-amber-800">{step.outcome}</p>}
          {!decision && <FlowCrossLinks links={step.crossFlows} onJump={onJump} compact />}
        </div>
      </div>
      {!last && <FlowBranchConnector branches={decision ? step.branches : []} onBranch={onBranch} />}
    </div>
  );
}