import { useState } from "react";
import { Check, ChevronDown, ChevronRight, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const toggleIn = (list, value) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export default function EventTypeSelect({ groups = [], categories = [], packages = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState([]);
  const count = categories.length + packages.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={groups.length === 0}
          className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {count === 0 ? "All event types" : `${count} selected`}
          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1.5 max-h-80 overflow-y-auto" align="start">
        {groups.map((g) => {
          const isOpen = expanded.includes(g.category);
          const catSelected = categories.includes(g.category);
          return (
            <div key={g.category}>
              <div className="flex items-center gap-1 rounded-md hover:bg-slate-50">
                <button
                  type="button"
                  onClick={() => setExpanded(toggleIn(expanded, g.category))}
                  className="p-1 text-slate-400 hover:text-slate-700"
                  aria-label={`Expand ${g.category}`}
                >
                  {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ categories: toggleIn(categories, g.category), packages })}
                  className="flex-1 flex items-center gap-2 py-1.5 pr-2 text-xs font-medium text-slate-700 text-left"
                >
                  <Check className={`w-3.5 h-3.5 ${catSelected ? "opacity-100 text-amber-600" : "opacity-0"}`} />
                  {g.category}
                  <span className="ml-auto text-slate-400 font-normal">{g.packages.length}</span>
                </button>
              </div>

              {isOpen && g.packages.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onChange({ categories, packages: toggleIn(packages, name) })}
                  className="w-full flex items-center gap-2 pl-9 pr-2 py-1.5 rounded-md text-xs text-slate-600 hover:bg-slate-50 text-left"
                >
                  <Check className={`w-3.5 h-3.5 flex-shrink-0 ${packages.includes(name) ? "opacity-100 text-amber-600" : "opacity-0"}`} />
                  <span className="truncate">{name}</span>
                </button>
              ))}
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}