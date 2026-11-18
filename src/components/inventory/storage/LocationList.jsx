import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Check, X, Warehouse } from "lucide-react";

export default function LocationList({ locations, counts, selectedId, onSelect, onRename, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const rows = [...locations.map((l) => ({ id: l.id, name: l.name, loc: l }))];

  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.id} onClick={() => onSelect(r.id)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer border transition-colors ${selectedId === r.id ? "border-slate-900 bg-slate-50" : "border-transparent hover:bg-slate-50"}`}>
          <Warehouse className="w-4 h-4 text-slate-500 shrink-0" />
          {editingId === r.id ? (
            <>
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="h-8" onClick={(e) => e.stopPropagation()} />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); if (draft.trim()) onRename(r.loc, draft.trim()); setEditingId(null); }}><Check className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditingId(null); }}><X className="w-4 h-4" /></Button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm font-medium truncate">{r.name}</span>
              <span className="text-xs text-slate-500">{counts[r.id] || 0}</span>
              {r.loc && (
                <>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setDraft(r.name); setEditingId(r.id); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(r.loc); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                </>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}