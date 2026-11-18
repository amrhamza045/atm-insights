import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

// Fuzzy score: substring match ranks highest; otherwise characters in order,
// rewarding consecutive runs and word starts. Returns -1 when no match.
function fuzzyScore(name, query) {
  const n = name.toLowerCase();
  const q = query.toLowerCase().replace(/\s+/g, "");
  if (!q) return 0;
  const idx = n.indexOf(query.toLowerCase().trim());
  if (idx >= 0) return 1000 - idx;
  let score = 0, pos = 0, run = 0;
  for (const ch of q) {
    const found = n.indexOf(ch, pos);
    if (found < 0) return -1;
    run = found === pos ? run + 1 : 0;
    score += 1 + run * 2 + (found === 0 || n[found - 1] === " " ? 3 : 0);
    pos = found + 1;
  }
  return score;
}

export default function IngredientPicker({ value, items, subLabel, onSelect }) {
  const selected = items.find((i) => i.id === value);
  const [text, setText] = useState(selected?.name || "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  useEffect(() => setText(selected?.name || ""), [selected?.name]);

  const results = useMemo(() => {
    const term = open && text !== selected?.name ? text : "";
    return items
      .map((item) => ({ item, s: fuzzyScore(item.name || "", term) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 30)
      .map((r) => r.item);
  }, [items, text, open, selected?.name]);

  const pick = (item) => { onSelect(item.id); setText(item.name); setOpen(false); };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); pick(results[active]); }
    else if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        value={text}
        placeholder="Type to search ingredients…"
        role="combobox"
        aria-expanded={open}
        onFocus={(e) => { setOpen(true); setActive(0); e.target.select(); }}
        onBlur={() => setTimeout(() => { setOpen(false); setText(selected?.name || ""); }, 150)}
        onChange={(e) => { setText(e.target.value); setOpen(true); setActive(0); }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div role="listbox" className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border bg-white shadow-lg">
          {results.length === 0 && <div className="p-3 text-sm text-slate-400">No matching ingredients</div>}
          {results.map((item, i) => (
            <button key={item.id} type="button" role="option" aria-selected={i === active}
              onMouseDown={() => pick(item)} onMouseEnter={() => setActive(i)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 ${i === active ? "bg-blue-50" : ""}`}>
              <span>{item.name}{subLabel(item) && <span className="ml-1 text-xs text-purple-700">(prepared sub-recipe)</span>}</span>
              {item.id === value && <Check className="w-4 h-4 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}