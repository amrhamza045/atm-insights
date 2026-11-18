import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Search, Check } from "lucide-react";

/**
 * Searchable CateringEquipment selector grouped by category.
 * Retired items are hidden from the list but a retired selection still shows
 * its stored label on the trigger so the row never loses its identity.
 */
export default function EquipmentPicker({ equipment = [], value, fallbackLabel = "", onChange, placeholder = "Select equipment" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = equipment.find((e) => e.id === value);
  const label = selected?.name || fallbackLabel || placeholder;

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = equipment.filter((e) => e.is_active !== false && (!term || (e.name || "").toLowerCase().includes(term)));
    const byCategory = new Map();
    list.forEach((e) => {
      const key = e.category || "Uncategorised";
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key).push(e);
    });
    return [...byCategory.entries()]
      .map(([name, items]) => ({ name, items: [...items].sort((a, b) => (a.name || "").localeCompare(b.name || "")) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [equipment, search]);

  const pick = (item) => {
    onChange(item);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex-1 justify-between font-normal">
          <span className={selected || fallbackLabel ? "truncate" : "truncate text-slate-500"}>{label}</span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(26rem,90vw)] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              className="h-8 pl-8"
              placeholder="Search equipment"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto p-1">
          {groups.length === 0 && <p className="text-sm text-slate-500 p-3">No active equipment matches that search.</p>}
          {groups.map((g) => (
            <div key={g.name}>
              <p className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{g.name}</p>
              {g.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pick(item)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 text-left"
                >
                  <span className="text-sm text-slate-700 truncate flex items-center gap-1.5">
                    {item.id === value && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    {item.name}
                  </span>
                  {item.requires_vehicle && <span className="text-xs text-warning-600 shrink-0">needs vehicle</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}