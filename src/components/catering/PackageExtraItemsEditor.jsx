import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

// Optional add-ons the visitor can tick for this package on the public site.
export default function PackageExtraItemsEditor({ rows, onChange }) {
  const update = (i, patch) => onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-xs text-slate-500">No extra items. Visitors will only see the package as it is.</p>}
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-center">
          <Input className="col-span-12 sm:col-span-4" placeholder="Item name" value={r.name || ""} onChange={(e) => update(i, { name: e.target.value })} />
          <Input className="col-span-12 sm:col-span-3" placeholder="Short description" value={r.description || ""} onChange={(e) => update(i, { description: e.target.value })} />
          <Input className="col-span-5 sm:col-span-2" type="number" min="0" placeholder="Price" value={r.price ?? ""} onChange={(e) => update(i, { price: e.target.value })} />
          <div className="col-span-5 sm:col-span-2">
            <Select value={r.scaling || "fixed"} onValueChange={(v) => update(i, { scaling: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="per_guest">Per guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="ghost" size="icon" className="col-span-2 sm:col-span-1" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => onChange([...rows, { name: "", description: "", price: 0, scaling: "fixed" }])}>
        <Plus className="w-4 h-4" /> Add extra item
      </Button>
    </div>
  );
}