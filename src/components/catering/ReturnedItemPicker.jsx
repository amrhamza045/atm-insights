import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check } from "lucide-react";

const add = (map, base, quantity, cost) => {
  const row = map.get(base.inventory_item_id) || { ...base, received: 0, cost: 0 };
  row.received += quantity;
  row.cost += cost;
  map.set(base.inventory_item_id, row);
};
const priced = (map) => [...map.values()].filter((r) => r.received > 0)
  .map((r) => ({ ...r, received: Math.round(r.received * 10000) / 10000, unit_cost: Math.round((r.cost / r.received) * 10000) / 10000 }));

// Only what this event received, each linked to its stock item in the unit it left stock:
// finished dishes its production batches made, and stock released to it. A return can then
// always be valued at the cost the event was charged.
async function loadEventOptions(event) {
  const [orders, releases] = await Promise.all([
    base44.entities.ProductionOrder.filter({ catering_event_id: event.id, status: "completed" }, "-created_date", 200),
    base44.entities.InventoryMovement.filter({ movement_type: "catering_release", event_id: event.id }, "-created_date", 500),
  ]);
  const dishes = new Map(), materials = new Map();
  for (const o of orders) {
    if (o.output_item_id) add(dishes, { key: `made-${o.output_item_id}`, inventory_item_id: o.output_item_id, name: o.output_item_name, unit: o.output_unit || "", category: "food" }, Number(o.actual_output_quantity) || 0, Number(o.total_cost) || 0);
  }
  for (const m of releases) {
    if (m.inventory_item_id) add(materials, { key: `rel-${m.inventory_item_id}`, inventory_item_id: m.inventory_item_id, name: m.inventory_item_name, unit: m.unit || "", category: "raw_material" }, Number(m.quantity) || 0, Number(m.cost_impact) || 0);
  }
  return { dishes: priced(dishes), materials: priced(materials) };
}

export default function ReturnedItemPicker({ event, value, label, onSelect }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["returned-item-options", event?.id],
    queryFn: () => loadEventOptions(event),
    enabled: !!event?.id,
  });
  const dishes = data?.dishes || [];
  const materials = data?.materials || [];

  const pick = (opt) => {
    onSelect({ item_name: opt.name, inventory_item_id: opt.inventory_item_id, unit: opt.unit, unit_cost: opt.unit_cost, category: opt.category, received: opt.received });
    setOpen(false);
  };

  const renderGroup = (heading, options) =>
    options.length > 0 && (
      <CommandGroup heading={heading}>
        {options.map((opt) => (
          <CommandItem key={opt.key} value={`${opt.name} ${opt.key}`} onSelect={() => pick(opt)}>
            <Check className={`w-4 h-4 mr-2 ${value === opt.inventory_item_id ? "opacity-100" : "opacity-0"}`} />
            <span className="truncate">{opt.name}</span>
            <span className="ml-auto text-xs text-slate-400">{opt.received} {opt.unit}</span>
          </CommandItem>
        ))}
      </CommandGroup>
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className={label ? "" : "text-slate-400"}>{label || "Select what the event received…"}</span>
          <ChevronsUpDown className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[340px]" align="start">
        <Command>
          <CommandInput placeholder="Search dishes & stock…" />
          <CommandList>
            <CommandEmpty>{isLoading ? "Loading…" : "Nothing was made for or released to this event yet."}</CommandEmpty>
            {renderGroup("Made for this event", dishes)}
            {renderGroup("Released from stock", materials)}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}