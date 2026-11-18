import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { findPlanningGaps } from "./planningGaps";

/** Lists active-quote lines that have no recipe, so planning cannot reserve stock for them. */
export default function UnplannedLinesWarning({ event }) {
  const { data: lines = [] } = useQuery({
    queryKey: ["catering-unplanned-lines", event?.active_quote_id],
    enabled: !!event?.active_quote_id,
    queryFn: async () => {
      const [quote, menuItems] = await Promise.all([
        base44.entities.CateringQuote.get(event.active_quote_id),
        base44.entities.MenuItem.list("-created_date", 500),
      ]);
      return findPlanningGaps(quote, menuItems);
    },
  });

  if (!event?.active_quote_id) {
    return (
      <Card className="p-3 border-amber-200 bg-amber-50 text-xs text-amber-800">
        This event has no active quote yet — create a quote before generating a plan.
      </Card>
    );
  }
  if (!lines.length) return null;

  return (
    <Card className="p-3 border-amber-200 bg-amber-50">
      <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
        <AlertTriangle className="w-4 h-4" /> {lines.length} food line(s) can't be planned — no inventory will be reserved for them
      </p>
      <div className="mt-1 space-y-0.5">
        {lines.map((l, i) => (
          <p key={i} className="text-xs text-amber-800">• {l.name} ({l.reason})</p>
        ))}
      </div>
      <p className="text-xs text-amber-800 mt-1">Link them to a menu item with a recipe, or prepare and source them manually.</p>
    </Card>
  );
}