import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarDays, X } from "lucide-react";

/** Availability window — bookings outside it don't count as holding the resource. */
export default function DateWindowFilter({ from, to, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-xs text-slate-500">
        <CalendarDays className="w-3.5 h-3.5 text-slate-400" /> Available from
      </span>
      <Input
        type="date"
        className="h-8 w-36"
        value={from || ""}
        onChange={(e) => onChange({ from: e.target.value, to })}
      />
      <span className="text-xs text-slate-400">to</span>
      <Input
        type="date"
        className="h-8 w-36"
        value={to || ""}
        min={from || undefined}
        onChange={(e) => onChange({ from, to: e.target.value })}
      />
      {(from || to) && (
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onChange({ from: "", to: "" })}>
          <X className="w-3.5 h-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}