import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { GitMerge, ShieldAlert } from "lucide-react";

// Fields staff can choose between when the two records conflict
const FIELDS = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "address", label: "Address" },
  { key: "client_type", label: "Client type" },
  { key: "notes", label: "Notes" }
];

const READ_ONLY = [
  { key: "total_spent", label: "Total spent" },
  { key: "visits_count", label: "Visits" },
  { key: "loyalty_tier_name", label: "Loyalty tier" },
  { key: "client_source", label: "Source" },
  { key: "created_date", label: "Registered" }
];

export default function MergeClientsDialog({ pair, open, onOpenChange, onMerged }) {
  const [survivorId, setSurvivorId] = useState(pair?.a?.id);
  const [picks, setPicks] = useState({});
  const [saving, setSaving] = useState(false);

  if (!pair) return null;
  const survivor = pair.a.id === survivorId ? pair.a : pair.b;
  const other = pair.a.id === survivorId ? pair.b : pair.a;

  const chosenValue = (key) => (picks[key] === "other" ? other[key] : survivor[key]);

  const handleMerge = async () => {
    setSaving(true);
    try {
      const survivorFields = {};
      for (const f of FIELDS) {
        if (picks[f.key] === "other" && other[f.key]) survivorFields[f.key] = other[f.key];
      }
      const res = await base44.functions.invoke("mergeClients", {
        survivorId: survivor.id,
        mergedId: other.id,
        survivorFields
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Records merged — the duplicate is archived, not deleted");
      onMerged?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e.message || "Merge failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="w-5 h-5" /> Merge duplicate clients
          </DialogTitle>
        </DialogHeader>

        {pair.confidence !== "high" && (
          <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              These records matched on name only — there is no shared phone or email. Confirm they are genuinely the same
              person before merging; two different people can share a name.
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {[pair.a, pair.b].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSurvivorId(c.id)}
              className={`p-3 rounded-lg border text-left ${c.id === survivorId ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}
            >
              <p className="font-medium truncate">{c.name}</p>
              <p className="text-xs text-slate-500">{c.id === survivorId ? "Surviving record" : "Will be archived"}</p>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {FIELDS.map((f) => {
            const conflict = survivor[f.key] && other[f.key] && survivor[f.key] !== other[f.key];
            return (
              <div key={f.key} className="grid grid-cols-3 gap-2 items-center text-sm border-b py-2">
                <span className="text-slate-500">{f.label}</span>
                <button
                  type="button"
                  onClick={() => setPicks((p) => ({ ...p, [f.key]: "survivor" }))}
                  className={`px-2 py-1 rounded text-left truncate ${picks[f.key] !== "other" ? "bg-emerald-50 font-medium" : ""}`}
                >
                  {survivor[f.key] || "—"}
                </button>
                <button
                  type="button"
                  onClick={() => setPicks((p) => ({ ...p, [f.key]: "other" }))}
                  className={`px-2 py-1 rounded text-left truncate ${picks[f.key] === "other" ? "bg-emerald-50 font-medium" : ""}`}
                >
                  {other[f.key] || "—"}
                  {conflict && <Badge variant="outline" className="ml-2 text-[10px]">conflict</Badge>}
                </button>
              </div>
            );
          })}

          {READ_ONLY.map((f) => (
            <div key={f.key} className="grid grid-cols-3 gap-2 text-sm text-slate-500 py-1">
              <span>{f.label}</span>
              <span className="truncate">{String(survivor[f.key] ?? "—").slice(0, 30)}</span>
              <span className="truncate">{String(other[f.key] ?? "—").slice(0, 30)}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-500">
          Orders, catering events, quotes, payments, cashback, purchases, payouts, campaign records, interactions and
          follow-ups on “{other.name}” move to “{chosenValue("name") || survivor.name}”. The duplicate record is marked
          merged and kept — nothing is deleted.
        </p>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleMerge} disabled={saving} className="gap-1.5">
            <GitMerge className="w-4 h-4" /> {saving ? "Merging..." : "Confirm merge"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}