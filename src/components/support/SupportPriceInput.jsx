import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

// Saves on blur/Enter only when the value actually changed.
export default function SupportPriceInput({ value, onSave }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  const commit = () => {
    const n = Number(v);
    if (v !== "" && !Number.isNaN(n) && n !== Number(value)) onSave(n);
  };
  return (
    <Input type="number" min="0" className="w-24" value={v}
      onChange={(e) => setV(e.target.value)} onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
  );
}