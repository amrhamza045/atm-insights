import React from "react";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Wrench, AlertTriangle } from "lucide-react";

/** Compact "reserved for event / under maintenance / damaged" line shown under a cost row. */
export default function AllocationBadges({ alloc }) {
  const names = [...new Set(alloc.events.map((e) => e.name))];
  if (!names.length && !alloc.maintenance && !alloc.damaged) {
    return <p className="text-xs text-emerald-600 mt-0.5">Available</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {names.map((n) => (
        <Badge key={n} className="text-xs bg-amber-100 text-amber-700 gap-1 font-normal">
          <CalendarCheck className="w-3 h-3" /> {n}
        </Badge>
      ))}
      {alloc.maintenance > 0 && (
        <Badge className="text-xs bg-blue-100 text-blue-700 gap-1 font-normal">
          <Wrench className="w-3 h-3" /> Maintenance ({alloc.maintenance})
        </Badge>
      )}
      {alloc.damaged > 0 && (
        <Badge className="text-xs bg-red-100 text-red-700 gap-1 font-normal">
          <AlertTriangle className="w-3 h-3" /> Damaged ({alloc.damaged})
        </Badge>
      )}
    </div>
  );
}