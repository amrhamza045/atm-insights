import React from "react";
import { ArrowUpRight } from "lucide-react";

export default function FlowCrossLinks({ links = [], onJump, compact = false }) {
  if (!links.length) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "mt-3" : "mt-4"}`} onClick={(event) => event.stopPropagation()}>
      {links.map((link) => (
        <button key={`${link.flowKey}-${link.label}`} type="button" onClick={() => onJump?.(link.flowKey)} className={`${compact ? "text-[11px] px-2 py-1" : "text-xs px-3 py-1.5"} inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 font-semibold text-violet-800 hover:bg-violet-100`}>
          {link.label}<ArrowUpRight className="w-3 h-3" />
        </button>
      ))}
    </div>
  );
}