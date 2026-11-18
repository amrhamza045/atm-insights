import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CalendarRange, X } from "lucide-react";

export default function LeadDateRangeFilter({ from, to, onChange, matched, total }) {
  const active = !!from || !!to;

  return (
    <div className="flex flex-wrap items-end gap-3 mb-3 p-3 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-1.5 text-slate-600 pb-2">
        <CalendarRange className="w-4 h-4" />
        <span className="text-xs font-medium">Created between</span>
      </div>
      <div>
        <Label className="text-xs text-slate-500">From</Label>
        <Input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => onChange({ from: e.target.value, to })}
          className="h-8 text-xs w-40"
        />
      </div>
      <div>
        <Label className="text-xs text-slate-500">To</Label>
        <Input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => onChange({ from, to: e.target.value })}
          className="h-8 text-xs w-40"
        />
      </div>
      {active && (
        <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => onChange({ from: "", to: "" })}>
          <X className="w-3.5 h-3.5" /> Clear
        </Button>
      )}
      {active && (
        <span className="text-xs text-slate-500 pb-2 ml-auto">
          Showing {matched} of {total} leads
        </span>
      )}
    </div>
  );
}