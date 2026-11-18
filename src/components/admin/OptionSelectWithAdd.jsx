import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Dropdown that also lets the user type a brand-new value.
export default function OptionSelectWithAdd({ value, onChange, options, placeholder }) {
  const [adding, setAdding] = useState(false);

  if (adding) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          value={value}
          placeholder="Type new value..."
          onChange={(e) => onChange(e.target.value)}
        />
        <Button type="button" variant="outline" onClick={() => setAdding(false)}>Done</Button>
      </div>
    );
  }

  return (
    <select
      value={value || ""}
      onChange={(e) => {
        if (e.target.value === "__new__") {
          onChange("");
          setAdding(true);
        } else {
          onChange(e.target.value);
        }
      }}
      className="w-full px-3 py-2 border rounded-lg text-sm"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
      <option value="__new__">+ Add new...</option>
    </select>
  );
}