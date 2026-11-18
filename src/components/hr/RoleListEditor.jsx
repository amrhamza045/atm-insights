import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

export default function RoleListEditor({ roles = [], onChange }) {
  const [draft, setDraft] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editValue, setEditValue] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v || roles.includes(v)) return setDraft("");
    onChange([...roles, v]);
    setDraft("");
  };

  const saveEdit = () => {
    const v = editValue.trim();
    if (v) onChange(roles.map((r, i) => (i === editIndex ? v : r)));
    setEditIndex(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="e.g. Catering Manager"
        />
        <Button type="button" onClick={add} className="gap-1 shrink-0">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {roles.length === 0 ? (
        <p className="text-xs text-slate-500">No roles yet — every position will be allowed for this department.</p>
      ) : (
        <div className="rounded-lg border divide-y">
          {roles.map((role, i) => (
            <div key={`${role}-${i}`} className="flex items-center gap-2 px-3 py-2">
              {editIndex === i ? (
                <>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEdit(); } }}
                    className="h-8"
                    autoFocus
                  />
                  <Button type="button" size="sm" variant="ghost" onClick={saveEdit}>
                    <Check className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditIndex(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-slate-800">{role}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditIndex(i); setEditValue(role); }}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onChange(roles.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}