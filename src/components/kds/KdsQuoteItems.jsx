import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { UtensilsCrossed } from "lucide-react";

// Quote lines for an event on the KDS, each with its kitchen note underneath.
// isMine (optional) limits the list to the viewer's own items.
export default function KdsQuoteItems({ eventId, isMine = null }) {
  const { data: allLines = [] } = useQuery({
    queryKey: ["kds-quote-items", eventId],
    enabled: !!eventId && eventId !== "none",
    queryFn: async () => {
      const ev = await base44.entities.CateringEvent.get(eventId);
      if (!ev?.active_quote_id) return [];
      const q = await base44.entities.CateringQuote.get(ev.active_quote_id);
      return (q?.line_items || []).filter((l) => Number(l.quantity) > 0 && (l.cost_category || "food") === "food");
    },
    refetchInterval: 30000,
  });
  const lines = isMine ? allLines.filter(isMine) : allLines;
  if (!lines.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase font-semibold text-muted-foreground flex items-center gap-1"><UtensilsCrossed className="w-3.5 h-3.5" /> Menu items</p>
      {lines.map((l, i) => (
        <div key={i} className="p-2 rounded bg-secondary text-secondary-foreground">
          <p className="text-sm">{l.quantity}× {l.name}</p>
          {l.kitchen_note && <p className="text-xs mt-1 font-medium text-warning-700">Note: {l.kitchen_note}</p>}
        </div>
      ))}
    </div>
  );
}