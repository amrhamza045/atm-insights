import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import SubTabsMenu from "./SubTabsMenu";

/** One module: its own switch, parent status and the Sub-tabs dropdown. */
export default function ModuleCard({ module: m, open, parent, parentOpen, subTabs, closedTabs, onToggle, onToggleTab, onSetTabs }) {
  const effective = open && parentOpen;
  return (
    <Card className="p-4 border shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">
            {m.label}
            {m.auto && (
              <span className="ml-2 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5 align-middle">NEW</span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{m.description}</p>
          {parent && (
            <p className={`text-xs mt-1 ${parentOpen ? "text-slate-400" : "text-amber-700"}`}>
              {parentOpen ? `Also closes with ${parent.label}` : `Closed with ${parent.label}`}
            </p>
          )}
        </div>
        <Badge variant={effective ? "default" : "outline"} className={effective ? "bg-emerald-600 text-white whitespace-nowrap" : "whitespace-nowrap"}>
          {effective ? "Open" : "Closed"}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-2 mt-auto">
        {subTabs.length > 0 ? (
          <SubTabsMenu tabs={subTabs} closed={closedTabs} locked={!effective && !m.navOnly} onToggle={onToggleTab} onSetMany={onSetTabs} />
        ) : (
          <span className="text-xs text-slate-400">No sub-tabs</span>
        )}
        <Switch checked={open} onCheckedChange={onToggle} aria-label={`${m.label} open`} />
      </div>
    </Card>
  );
}