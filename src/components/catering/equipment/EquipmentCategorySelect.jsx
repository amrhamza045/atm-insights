import React from "react";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";

const NEW = "__new__";

/** Category picker: every known category, plus "New category…", which asks the parent to open the add dialog. */
export default function EquipmentCategorySelect({ value, options, onChange, onNew, className = "h-8" }) {
  const list = value && !options.includes(value) ? [...options, value] : options;
  return (
    <Select value={value || undefined} onValueChange={(v) => (v === NEW ? onNew() : onChange(v))}>
      <SelectTrigger className={className} aria-label="Category">
        <SelectValue placeholder="Choose a category" />
      </SelectTrigger>
      <SelectContent>
        {list.map((c) => (
          <SelectItem key={c} value={c}>{c}</SelectItem>
        ))}
        <SelectSeparator />
        <SelectItem value={NEW} className="font-medium text-amber-700">+ New category…</SelectItem>
      </SelectContent>
    </Select>
  );
}