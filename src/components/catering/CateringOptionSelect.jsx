import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCateringOptions } from "./useCateringOptions";

export default function CateringOptionSelect({ listType, value, onChange, placeholder = "Select…" }) {
  const { options } = useCateringOptions(listType);
  const names = options.map((o) => o.name);
  // Keep a legacy/inactive value visible so historical events never lose their data
  if (value && !names.includes(value)) names.unshift(value);

  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {names.length === 0 ? (
          <SelectItem value="__none" disabled>No options configured</SelectItem>
        ) : (
          names.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)
        )}
      </SelectContent>
    </Select>
  );
}