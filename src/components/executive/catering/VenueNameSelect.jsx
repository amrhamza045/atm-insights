import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export default function VenueNameSelect({ options = [], selected = [], onChange }) {
  const [open, setOpen] = useState(false);
  const disabled = options.length === 0;

  const toggle = (name) =>
    onChange(selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selected.length === 0 ? "All venues" : `${selected.length} venue${selected.length > 1 ? "s" : ""}`}
            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search venues…" />
            <CommandList>
              <CommandEmpty>No venue found.</CommandEmpty>
              <CommandGroup>
                {options.map((name) => (
                  <CommandItem key={name} value={name} onSelect={() => toggle(name)} className="text-xs">
                    <Check className={`mr-2 w-3.5 h-3.5 ${selected.includes(name) ? "opacity-100 text-amber-600" : "opacity-0"}`} />
                    {name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.map((name) => (
        <span key={name} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-800">
          {name}
          <button type="button" onClick={() => toggle(name)} className="rounded-full p-0.5 hover:bg-amber-100" aria-label={`Remove ${name}`}>
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
}