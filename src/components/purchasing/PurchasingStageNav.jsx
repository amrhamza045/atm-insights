import React from "react";

export default function PurchasingStageNav({ stages, activeKey, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200 overflow-x-auto">
      {stages.map((stage) => (
        <button
          key={stage.key}
          onClick={() => onChange(stage.key)}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeKey === stage.key
              ? "border-slate-800 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          {stage.icon && <stage.icon className="w-4 h-4" />}
          {stage.label}
        </button>
      ))}
    </div>
  );
}