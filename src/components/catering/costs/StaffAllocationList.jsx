import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, ChevronDown, ChevronRight } from "lucide-react";
import AllocationBadges from "./AllocationBadges";
import { useAllocations, matchesAllocation } from "./useAllocations";

/** Who is currently reserved on which event — additive view alongside the role rates. */
export default function StaffAllocationList({ filter = { status: "all", eventId: "all", from: "", to: "" } }) {
  const { staffAllocations } = useAllocations(filter);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  const rows = staffAllocations()
    .map((s) => ({ ...s, alloc: { events: s.events, maintenance: 0, damaged: 0 } }))
    .filter((s) => matchesAllocation(s.alloc, filter.status, filter.eventId))
    .filter((s) => !search.trim() || s.employee_name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <Card className="p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left"
      >
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" /> Staff reservations
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
          )}
        </h3>
        <p className="text-sm text-slate-500 mt-1">Which staff members are booked, and for which events.</p>
      </button>

      {expanded && (<>
      <Input
        className="h-8 mt-3 mb-2 max-w-xs"
        placeholder="Search staff…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No staff match this filter.</p>
      ) : (
        <div className="divide-y">
          {rows.map((s) => (
            <div key={s.employee_id} className="py-2">
              <p className="text-sm text-slate-800">
                {s.employee_name}
                {s.role_name ? <span className="text-slate-400"> · {s.role_name}</span> : null}
              </p>
              <AllocationBadges alloc={s.alloc} />
            </div>
          ))}
        </div>
      )}
      </>)}
    </Card>
  );
}