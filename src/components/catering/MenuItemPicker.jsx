import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, ChevronRight, Search, Check } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

/**
 * Menu item selector grouped by menu section/category.
 * Sections are collapsed until clicked; typing searches across every section
 * and auto-expands the sections that still have matches.
 */
export default function MenuItemPicker({ items = [], value, onChange, placeholder = "Select menu item" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({});

  const { data: sections = [] } = useQuery({
    queryKey: ["menu-sections-order"],
    queryFn: () => base44.entities.MenuSection.list("sort_order", 200),
  });

  const selected = items.find((i) => i.id === value);

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matched = term ? items.filter((i) => (i.name || "").toLowerCase().includes(term)) : items;

    const byCategory = new Map();
    matched.forEach((i) => {
      const key = i.category || "Uncategorised";
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key).push(i);
    });

    const order = sections.map((s) => s.name);
    return [...byCategory.entries()]
      .map(([name, list]) => ({ name, list: [...list].sort((a, b) => (a.name || "").localeCompare(b.name || "")) }))
      .sort((a, b) => {
        const ai = order.indexOf(a.name), bi = order.indexOf(b.name);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [items, sections, search]);

  const searching = search.trim().length > 0;

  const pick = (item) => {
    onChange(item.id);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex-1 justify-between font-normal">
          <span className={selected ? "truncate" : "truncate text-slate-500"}>{selected?.name || placeholder}</span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(28rem,90vw)] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              className="h-8 pl-8"
              placeholder="Search all menu items"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto p-1">
          {groups.length === 0 && <p className="text-sm text-slate-500 p-3">No menu items match that search.</p>}

          {groups.map((g) => {
            const isOpen = searching || !!expanded[g.name];
            return (
              <div key={g.name}>
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [g.name]: !e[g.name] }))}
                  className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-md hover:bg-slate-100 text-left"
                >
                  <span className="text-sm font-medium text-slate-900 truncate">{g.name}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                    {g.list.length}
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </span>
                </button>

                {isOpen && (
                  <div className="pl-2">
                    {g.list.map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => pick(i)}
                        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-slate-100 text-left"
                      >
                        <span className="text-sm text-slate-700 truncate flex items-center gap-1.5">
                          {i.id === value && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                          {i.name}
                        </span>
                        <span className="text-xs text-slate-500 shrink-0">{formatCurrency(i.price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}