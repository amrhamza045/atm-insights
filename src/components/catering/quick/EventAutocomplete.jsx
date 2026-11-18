import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBranch } from "@/components/branches/BranchContext";

// Event search shared by the quick actions. With allowNew, an unmatched name offers "New event".
export default function EventAutocomplete({ picked, onPick, onNew, allowNew = false }) {
  const { selectedBranchId } = useBranch();
  const [text, setText] = useState("");
  const term = text.trim();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["quick-event-search", selectedBranchId, term],
    queryFn: () => {
      const q = { status: { $nin: ["cancelled", "completed"] } };
      if (selectedBranchId) q.branch_id = selectedBranchId;
      if (term) q.$or = ["event_name", "client_name", "event_code"].map((f) => ({ [f]: { $regex: term, $options: "i" } }));
      return base44.entities.CateringEvent.filter(q, "event_date", 20);
    },
    enabled: !picked,
  });

  const exact = events.some((e) => (e.event_name || "").toLowerCase() === term.toLowerCase());

  return (
    <div className="space-y-2">
      <Label>Event <span className="text-red-500">*</span></Label>
      <Input
        autoFocus
        value={picked ? picked.event_name : text}
        onChange={(e) => { onPick(null); setText(e.target.value); }}
        placeholder={allowNew ? "Search an event or type a new name…" : "Search event, client or code…"}
      />
      {!picked && (
        <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
          {allowNew && term && !exact && (
            <button type="button" onClick={() => onNew(term)} className="w-full text-left px-3 py-2 hover:bg-amber-50 flex items-center gap-2 text-sm font-medium text-amber-700">
              <Plus className="w-4 h-4" /> New event “{term}”
            </button>
          )}
          {isLoading ? <p className="p-3 text-sm text-slate-500">Searching…</p>
            : events.length === 0 ? <p className="p-3 text-sm text-slate-500">No matching events.</p>
            : events.map((ev) => (
              <button key={ev.id} type="button" onClick={() => onPick(ev)} className="w-full text-left px-3 py-2 hover:bg-slate-50">
                <p className="text-sm font-medium text-slate-900">{ev.event_name}</p>
                <p className="text-xs text-slate-500">{ev.client_name} · {ev.event_date}</p>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}