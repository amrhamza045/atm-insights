import React from "react";
import { ArrowRight } from "lucide-react";

export default function FlowBranchConnector({ branches = [], onBranch }) {
  if (!branches.length) return <ArrowRight className="w-6 h-6 mx-2 text-slate-300 shrink-0" />;
  return (
    <div className="w-40 mx-3 shrink-0 flex flex-col justify-center gap-2" aria-label="Decision branches">
      {branches.map((branch) => (
        <button key={branch.label} type="button" onClick={() => onBranch?.(branch)} className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold ${branch.crossFlowKey ? "border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100" : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"}`}>
          <span>{branch.label}</span><ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      ))}
    </div>
  );
}