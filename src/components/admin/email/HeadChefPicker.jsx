import { useState } from "react";
import { toast } from "sonner";
import { ChefHat, AlertTriangle, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AUTO = "__auto__";

// Chooses who receives the kitchen brief. Saves straight away (not part of the switch draft).
export default function HeadChefPicker({ chef, employees, selectedId, onSelect, loading }) {
  const [saving, setSaving] = useState(false);
  const selectedActive = !!selectedId && employees.some((e) => e.id === selectedId);

  const choose = async (value) => {
    setSaving(true);
    try {
      await onSelect(value === AUTO ? "" : value);
      toast.success(value === AUTO ? "Head Chef set to automatic" : "Head Chef saved");
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "Could not save the Head Chef");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="flex items-center gap-1.5 text-xs text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" />Checking the Head Chef…</p>;
  }

  return (
    <div className="space-y-2">
      {chef?.chef_selected ? (
        <p className={`flex items-center gap-1.5 text-xs ${chef.email ? "text-emerald-700" : "text-red-600"}`}>
          {chef.email ? <ChefHat className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
          {chef.chef_name}{chef.email ? "" : " has no email on file"}
          <span className="text-slate-400">· {selectedActive ? "chosen here" : "the only employee with the Chef permission"}</span>
        </p>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />No Head Chef is set, so the brief isn't sent. Choose one below.
        </p>
      )}
      {selectedId && !selectedActive && (
        <p className="text-xs text-amber-700">The chosen Head Chef is no longer active, so the automatic choice applies.</p>
      )}
      <div className="flex items-center gap-2">
        <Select value={selectedActive ? selectedId : AUTO} onValueChange={choose} disabled={saving}>
          <SelectTrigger className="h-8 w-full sm:w-80 text-xs bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={AUTO}>Automatic: the one employee with the Chef permission</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}{e.department ? ` · ${e.department}` : ""}{e.email ? "" : " (no email)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      </div>
    </div>
  );
}