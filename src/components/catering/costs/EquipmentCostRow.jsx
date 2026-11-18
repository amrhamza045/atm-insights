import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListOrdered, Trash2 } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import AllocationBadges from "@/components/catering/costs/AllocationBadges";
import EquipmentCategorySelect from "@/components/catering/equipment/EquipmentCategorySelect";

/** One item in Predefined equipment costs. Every field is a draft, saved with the card's Save changes button. */
export default function EquipmentCostRow({ item, draft, onChange, categories, onNewCategory, unitCount, alloc, onUnits, onDelete }) {
  return (
    <div className="py-2 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-sm text-slate-800 truncate">{item.name}</p>
          <button type="button" onClick={onDelete} className="p-1 rounded hover:bg-red-50" aria-label="Delete equipment">
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
        <p className="text-xs text-slate-400">
          {item.tracking_mode === "unit" ? "Individually tracked units" : "Bulk stock"} · per {item.unit_label || "pcs"}
        </p>
        <button type="button" onClick={onUnits} className="mt-0.5 text-xs font-medium text-amber-700 hover:underline flex items-center gap-1">
          <ListOrdered className="w-3.5 h-3.5" />
          Unit IDs ({unitCount})
        </button>
        <AllocationBadges alloc={alloc} />
      </div>
      <EquipmentCategorySelect value={draft.category} options={categories} onChange={(v) => onChange("category", v)} onNew={onNewCategory} />
      <Select value={draft.cost_source || "owned"} onValueChange={(v) => onChange("cost_source", v)}>
        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="owned">Owned (wear charge)</SelectItem>
          <SelectItem value="rented">Rented (fee per event)</SelectItem>
        </SelectContent>
      </Select>
      <div>
        <Input type="number" min="0" className="h-8" placeholder="Cost per event (EGP)" value={draft.usage_cost_per_event ?? ""} onChange={(ev) => onChange("usage_cost_per_event", ev.target.value)} />
        <p className="text-xs text-slate-400 mt-0.5">Cost per piece per event</p>
      </div>
      <div>
        <Input type="number" min="0" className="h-8" placeholder="Replacement cost (EGP)" value={draft.replacement_cost ?? ""} onChange={(ev) => onChange("replacement_cost", ev.target.value)} />
        <p className="text-xs text-slate-400 mt-0.5">
          Charged for loss/damage · currently {formatCurrency(Number(draft.replacement_cost) || 0)}
        </p>
      </div>
    </div>
  );
}