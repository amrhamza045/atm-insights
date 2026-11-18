import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserPlus, UserMinus, MapPin } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { LOCATION_LABELS } from "./attendanceLocation";

export default function RoleCoverageCard({ requirement, assignments, onChangeCount, onAssign, onRelease, onSetLocation, readOnly }) {
  const filled = assignments.length;
  const required = Number(requirement.required_count) || 0;
  const short = Math.max(0, required - filled);
  const [draftCount, setDraftCount] = useState(String(required));
  const [savingCount, setSavingCount] = useState(false);

  useEffect(() => {
    if (!savingCount) setDraftCount(String(required));
  }, [required, savingCount]);

  const saveCount = async () => {
    const next = Math.max(0, parseInt(draftCount, 10) || 0);
    setDraftCount(String(next));
    if (next === required) return;
    setSavingCount(true);
    try {
      await onChangeCount(next);
    } finally {
      setSavingCount(false);
    }
  };

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium text-sm text-slate-900 flex items-center gap-1.5">
            {requirement.role_name}
            {requirement.is_critical && <Badge className="bg-red-50 text-red-700 text-xs">critical</Badge>}
          </div>
          <p className="text-xs text-slate-500">
            {filled}/{required} filled
            {requirement.suggested_count ? ` · suggested ${requirement.suggested_count}` : ""}
          </p>
        </div>
        <Badge className={short === 0 ? "bg-emerald-100 text-emerald-700 text-xs" : "bg-amber-100 text-amber-700 text-xs"}>
          {short === 0 ? "Covered" : `${short} needed`}
        </Badge>
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            className="h-8 w-20"
            value={draftCount}
            onChange={(e) => setDraftCount(e.target.value)}
            onBlur={saveCount}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            disabled={savingCount}
            aria-label={`Required ${requirement.role_name} count`}
          />
          {savingCount && <span className="text-xs text-slate-500">Saving…</span>}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onAssign}>
            <UserPlus className="w-3.5 h-3.5" /> Assign
          </Button>
        </div>
      )}

      <div className="space-y-1">
        {assignments.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-2 text-xs bg-slate-50 rounded px-2 py-1.5">
            <div className="min-w-0">
              <p className="truncate text-slate-800">
                {a.employee_name}
                {a.employment_type !== "regular" ? ` (${a.employment_type})` : ""}
              </p>
              <p className="text-slate-500">
                {LOCATION_LABELS[a.check_in_location_type || "branch"]} · {a.start_time}–{a.end_time} · {a.expected_hours}h · {formatCurrency(a.estimated_cost)}
                {a.availability_conflict ? " · double-booked (overridden)" : ""}
              </p>
            </div>
            {!readOnly && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 gap-1 text-xs"
                  onClick={() => onSetLocation(a, (a.check_in_location_type || "branch") === "branch" ? "event_site" : "branch")}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {(a.check_in_location_type || "branch") === "branch" ? "Move to site" : "Move to branch"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => onRelease(a)}>
                  <UserMinus className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}