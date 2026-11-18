import React from "react";
import { Card } from "@/components/ui/card";
import { Coins } from "lucide-react";
import StaffAllocationList from "./costs/StaffAllocationList";

/**
 * Predefined staffing costs — not tied to any event.
 * Per-event figures and overrides live on the Staffing tab once an event is scoped.
 */
export default function StaffingCostsTab({ filter }) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Coins className="w-4 h-4 text-slate-400" /> Predefined staffing costs
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          These rates apply to every event. Scope an event and open the Staffing tab to see its labor cost and override a
          rate for that event only.
        </p>
      </Card>

      <StaffAllocationList filter={filter} />

    </div>
  );
}