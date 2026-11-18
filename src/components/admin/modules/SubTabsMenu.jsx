import React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SubTabRow from "./SubTabRow";

/**
 * "Sub-tabs (N)" dropdown: one Open/Closed switch per sub-tab, grouped by
 * screen or tab group. With onSetMany, each group heading also gets an "All"
 * switch that opens or closes the whole group at once.
 */
export default function SubTabsMenu({ tabs, closed, locked, onToggle, onSetMany }) {
  const closedCount = tabs.filter((t) => locked || closed.includes(t.id)).length;
  const sections = [...new Set(tabs.map((t) => t.section))];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          Sub-tabs ({tabs.length})
          {closedCount > 0 && <span className="text-amber-700">· {closedCount} closed</span>}
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {locked && (
            <p className="px-2 pt-1 text-xs text-amber-700">This module is closed, so all of its sub-tabs are closed too.</p>
          )}
          {sections.map((section) => {
            const rows = tabs.filter((t) => t.section === section);
            const ids = rows.map((t) => t.id);
            return (
              <div key={section} className="space-y-0.5">
                <div className="flex items-center justify-between gap-2 px-2 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{section}</p>
                  {onSetMany && rows.length > 1 && (
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      All
                      <Switch
                        checked={!locked && ids.some((id) => !closed.includes(id))}
                        disabled={locked}
                        onCheckedChange={(on) => onSetMany(ids, !on)}
                        aria-label={`Open or close all of ${section}`}
                      />
                    </span>
                  )}
                </div>
                {rows.map((t) => (
                  <SubTabRow key={t.id} tab={t} open={!locked && !closed.includes(t.id)} locked={locked} onToggle={onToggle} />
                ))}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}