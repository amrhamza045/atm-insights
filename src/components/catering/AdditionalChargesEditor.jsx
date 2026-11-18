import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";

const CATEGORIES = ["extra_food", "beverage", "overtime", "equipment_damage", "equipment_loss", "transport", "other"];

export default function AdditionalChargesEditor({ charges, onChange, disabled }) {
  const [draft, setDraft] = useState({ label: "", amount: "", category: "extra_food" });

  const add = () => {
    if (!draft.label.trim()) return;
    onChange([...(charges || []), { label: draft.label.trim(), amount: Number(draft.amount) || 0, category: draft.category }]);
    setDraft({ label: "", amount: "", category: "extra_food" });
  };

  return (
    <div className="space-y-2">
      {(charges || []).map((c, i) => (
        <div key={i} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
          <span className="min-w-0 truncate">{c.label} <span className="text-xs text-slate-400">({c.category?.replace(/_/g, " ")})</span></span>
          <span className="flex items-center gap-2 shrink-0">
            <span className="font-medium">{formatCurrency(c.amount || 0, true)}</span>
            {!disabled && (
              <Button size="sm" variant="ghost" className="h-6 text-red-500" onClick={() => onChange(charges.filter((_, x) => x !== i))}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </span>
        </div>
      ))}
      {!disabled && (
        <div className="flex flex-wrap gap-2">
          <Input className="flex-1 min-w-[140px]" placeholder="Extra charge (e.g. bar consumption)" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <Input type="number" min="0" className="w-28" placeholder="Amount" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
          <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="px-2 border rounded-lg text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
          <Button variant="outline" className="gap-1" onClick={add}><Plus className="w-4 h-4" /> Add</Button>
        </div>
      )}
      {(charges || []).length === 0 && disabled && <p className="text-sm text-slate-400">No additional charges.</p>}
    </div>
  );
}