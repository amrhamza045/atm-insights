import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isEmailAddress } from "./recipientChoice";

// Add any address (several at once, separated by commas or spaces).
export default function EmailAddressAdder({ existing, onAdd }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const add = () => {
    const list = [...new Set(value.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))];
    const bad = list.filter((e) => !isEmailAddress(e));
    if (bad.length) return setError(`Not a valid email: ${bad.join(", ")}`);
    const fresh = list.filter((e) => !existing.includes(e));
    if (!fresh.length) return setError("Already on the list");
    onAdd(fresh);
    setValue("");
    setError("");
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          type="text"
          inputMode="email"
          autoComplete="off"
          value={value}
          placeholder="name@example.com"
          onChange={(e) => { setValue(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="h-8 w-60 bg-white text-sm"
        />
        <Button size="sm" variant="outline" className="h-8 bg-white" onClick={add} disabled={!value.trim()}>
          <Plus />Add email
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}