import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * "Permissions (N)" dropdown inside a module card: one On/Off switch per
 * action permission, grouped by section. With onSetMany, each section heading
 * gets an "All" switch.
 */
export default function PermissionsMenu({ items, permissions, onToggle, onSetMany, note }) {
  const onCount = items.filter((i) => permissions[i.key]).length;
  const sections = [...new Set(items.map((i) => i.section || "Permissions"))];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          Permissions ({items.length})
          <span className={onCount ? "text-emerald-700" : "text-slate-400"}>· {onCount} on</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 p-0">
        <div className="max-h-96 overflow-y-auto p-2 space-y-3">
          {note && <p className="px-2 pt-1 text-xs text-amber-700">{note}</p>}
          {sections.map((section) => {
            const rows = items.filter((i) => (i.section || "Permissions") === section);
            const keys = rows.filter((i) => !i.lockedNote).map((i) => i.key);
            return (
              <div key={section} className="space-y-0.5">
                <div className="flex items-center justify-between gap-2 px-2 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{section}</p>
                  {onSetMany && rows.length > 1 && (
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      All
                      <Switch checked={keys.some((k) => permissions[k])} onCheckedChange={(on) => onSetMany(keys, on)}
                        aria-label={`Turn all of ${section} on or off`} />
                    </span>
                  )}
                </div>
                {rows.map((i) => (
                  <div key={i.key} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800">{i.label}</p>
                      {i.description && <p className={`text-xs ${i.warning ? "text-amber-700" : "text-slate-500"}`}>{i.description}</p>}
                      {i.lockedNote && <p className="text-xs italic text-slate-500">{i.lockedNote}</p>}
                    </div>
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-shrink-0">
                      {permissions[i.key] ? "On" : "Off"}
                      <Switch checked={!!permissions[i.key]} onCheckedChange={() => onToggle(i.key)} disabled={!!i.lockedNote} aria-label={i.label} />
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}