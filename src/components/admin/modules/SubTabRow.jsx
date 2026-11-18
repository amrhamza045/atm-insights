import React from "react";
import { Switch } from "@/components/ui/switch";

/** One sub-tab in the Sub-tabs dropdown: its name, an optional note and its switch. */
export default function SubTabRow({ tab, open, locked, onToggle }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50 cursor-pointer">
      <span className="min-w-0">
        <span className="block text-sm text-slate-800">{tab.label}</span>
        {tab.note && <span className="block text-xs text-slate-400">{tab.note}</span>}
      </span>
      <span className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs ${open ? "text-emerald-700" : "text-slate-400"}`}>{open ? "Open" : "Closed"}</span>
        <Switch checked={open} disabled={locked} onCheckedChange={() => onToggle(tab.id)} />
      </span>
    </label>
  );
}