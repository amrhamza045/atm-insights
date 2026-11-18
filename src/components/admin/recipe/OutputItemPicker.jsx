import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Check } from "lucide-react";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Type-ahead inventory search; offers "Create item" when no exact name match.
export default function OutputItemPicker({ value, valueName, branchId, onSelect, onCreate }) {
  const [text, setText] = useState(valueName || "");
  const [open, setOpen] = useState(false);
  useEffect(() => setText(valueName || ""), [valueName]);

  const term = text.trim();
  const { data: matches = [], isFetching } = useQuery({
    queryKey: ["outputItemSearch", branchId, term],
    enabled: open && term.length > 0,
    queryFn: async () => {
      const q = { name: { $regex: escapeRegex(term), $options: "i" } };
      const page = await base44.entities.InventoryItem.filter(q, { sort: "name", limit: 50 });
      const items = page.items || [];
      if (!branchId) return items.slice(0, 20);
      return items.filter((i) => i.branch_id === branchId).slice(0, 20);
    },
  });
  const exact = matches.some((m) => m.name.trim().toLowerCase() === term.toLowerCase());

  return (
    <div className="relative">
      <Input
        value={text}
        placeholder="Type to search items…"
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
      />
      {open && term && (
        <div className="absolute z-50 mt-1 w-72 max-h-64 overflow-y-auto rounded-md border bg-white shadow-lg">
          {isFetching && <div className="p-2 text-xs text-slate-400 flex gap-1 items-center"><Loader2 className="w-3 h-3 animate-spin" /> Searching…</div>}
          {matches.map((item) => (
            <button key={item.id} type="button" onMouseDown={() => { onSelect(item); setText(item.name); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between gap-2">
              <span>{item.name}<span className="block text-xs text-slate-400">{item.category_name || "Uncategorized"}</span></span>
              {item.id === value && <Check className="w-4 h-4 text-blue-600" />}
            </button>
          ))}
          {!isFetching && !exact && (
            <button type="button" onMouseDown={() => { onCreate(term); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2 border-t">
              <Plus className="w-4 h-4" /> Create item “{term}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}