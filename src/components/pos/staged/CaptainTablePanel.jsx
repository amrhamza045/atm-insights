import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CaptainTablePanel({ form, setForm, tables = [] }) {
  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const sortedTables = useMemo(
    () => [...tables].sort((a, b) =>
      (parseInt(String(a.table_number || "").replace(/\D/g, ""), 10) || 0) -
      (parseInt(String(b.table_number || "").replace(/\D/g, ""), 10) || 0)
    ),
    [tables]
  );

  return (
    <div className="space-y-3 pb-3 border-b">
      <div className="space-y-2">
        <Label className="text-xs">Table <span className="text-red-500">*</span></Label>
        {sortedTables.length > 0 && (
          <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
            {sortedTables.map((t) => (
              <button
                key={t.id}
                onClick={() => set("table_number", String(t.table_number))}
                className={`h-11 rounded-xl text-sm font-semibold border transition-colors ${
                  form.table_number === String(t.table_number)
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {t.table_number}
              </button>
            ))}
          </div>
        )}
        <Input value={form.table_number} onChange={(e) => set("table_number", e.target.value)} placeholder="Or type the table number..." className="h-10" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Guests</Label>
          <Input type="number" min="0" value={form.guest_count} onChange={(e) => set("guest_count", e.target.value)} placeholder="0" className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Guest Name</Label>
          <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="Optional" className="h-10" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Table Notes</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Allergies, timing, special requests..." rows={2} />
      </div>
    </div>
  );
}