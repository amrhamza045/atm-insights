import { useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// Search the active employees and tick the ones who should receive this email. Stays open for several picks.
export default function EmployeePicker({ employees, selected, onToggle, loading }) {
  const [open, setOpen] = useState(false);
  const active = employees.filter((e) => e.active);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 bg-white" disabled={loading}>
          <UserPlus />Add employees{selected.length ? ` (${selected.length})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search name, department or email" />
          <CommandList>
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandGroup>
              {active.map((e) => (
                <CommandItem
                  key={e.id}
                  value={`${e.name} ${e.department} ${e.position} ${e.email} ${e.id}`}
                  disabled={!e.email}
                  onSelect={() => onToggle(e.id)}
                >
                  <Check className={selected.includes(e.id) ? "opacity-100" : "opacity-0"} />
                  <div className="min-w-0">
                    <p className="truncate">{e.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {e.email || "No email on file"}{e.department ? ` · ${e.department}` : ""}
                    </p>
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