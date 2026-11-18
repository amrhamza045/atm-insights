import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// options: [{ value, label, sub }]. Empty value "" is allowed as a "none" option.
export default function SupplierCombobox({ value, options, onChange, placeholder = "Select supplier", className }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === (value || ""));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn("flex items-center justify-between gap-2 px-3 py-2 border rounded-lg text-sm bg-white text-left", className)}>
          <span className={cn("truncate", !current?.value && "text-slate-500")}>{current?.label || placeholder}</span>
          <ChevronsUpDown className="w-4 h-4 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-72" align="start">
        <Command>
          <CommandInput placeholder="Search supplier..." />
          <CommandList>
            <CommandEmpty>No supplier found</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value || "__none"}
                  value={`${o.label} ${o.sub || ""} ${o.value}`}
                  onSelect={() => { onChange(o.value); setOpen(false); }}
                >
                  <Check className={cn("w-4 h-4 mr-2", o.value === (value || "") ? "opacity-100" : "opacity-0")} />
                  <div className="min-w-0">
                    <div className="truncate">{o.label}</div>
                    {o.sub && <div className="text-xs text-slate-500 truncate">{o.sub}</div>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}