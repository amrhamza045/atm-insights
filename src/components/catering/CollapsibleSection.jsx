import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function CollapsibleSection({ title, subtitle, action, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-left flex-1 min-w-0"
        >
          {open ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
          <span className="min-w-0">
            <span className="block text-sm font-medium text-slate-900">{title}</span>
            {subtitle && <span className="block text-xs text-slate-500">{subtitle}</span>}
          </span>
        </button>
        {action}
      </div>
      {open && <div className="border-t p-3">{children}</div>}
    </div>
  );
}