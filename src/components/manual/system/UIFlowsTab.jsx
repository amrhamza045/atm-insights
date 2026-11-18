import React, { useState } from "react";
import { GitBranch } from "lucide-react";
import UIFlowStep from "./UIFlowStep";
import FlowDetailPanel from "./FlowDetailPanel";

const normalize = (value) => Array.isArray(value)
  ? { type: "step", title: value[0], summary: value[1], outcome: value[2] }
  : value;

export default function UIFlowsTab({ flow, onJumpToFlow }) {
  const [active, setActive] = useState(0);
  const step = normalize(flow.steps[active]);
  const followBranch = (branch) => branch.crossFlowKey
    ? onJumpToFlow?.(branch.crossFlowKey)
    : Number.isInteger(branch.targetStepIndex) && setActive(branch.targetStepIndex);

  return (
    <section key={flow.key}>
      <div className="flex items-start gap-3 mb-7">
        <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700"><GitBranch className="w-6 h-6" /></div>
        <div><p className="text-sm font-medium text-amber-700">{flow.group} · UI Flow {flow.number}</p><h2 className="text-2xl font-bold text-slate-900">{flow.title}</h2><p className="text-sm text-slate-500 mt-1">{flow.audience}</p></div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-6 overflow-x-auto">
        <div className="flex items-center min-w-max">
          {flow.steps.map((item, index) => <UIFlowStep key={`${flow.key}-${index}`} step={item} number={index + 1} active={active === index} onClick={() => setActive(index)} onJump={onJumpToFlow} onBranch={followBranch} last={index === flow.steps.length - 1} />)}
        </div>
      </div>
      <FlowDetailPanel step={step} number={active + 1} onJump={onJumpToFlow} />
    </section>
  );
}