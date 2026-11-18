import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitMerge, AlertTriangle } from "lucide-react";

const REASON_LABEL = { phone: "Same phone", email: "Same email", name: "Same name" };

export default function DuplicatePairRow({ pair, canMerge, onReview }) {
  const isHigh = pair.confidence === "high";

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 p-3 border rounded-lg bg-white">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        {[pair.a, pair.b].map((c) => (
          <div key={c.id} className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{c.name}</p>
            <p className="text-xs text-slate-500 truncate">{c.phone || "no phone"} · {c.email || "no email"}</p>
            <p className="text-xs text-slate-400">
              {c.client_source || "—"} · EGP {Math.round(c.total_spent || 0).toLocaleString()} · {c.visits_count || 0} visits
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge className={isHigh ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
          {isHigh ? "High confidence" : "Needs review"}
        </Badge>
        {pair.reasons.map((r) => (
          <Badge key={r} variant="outline" className="text-xs">{REASON_LABEL[r] || r}</Badge>
        ))}
        {!isHigh && <AlertTriangle className="w-4 h-4 text-amber-500" title="Name match only — confirm it is the same person" />}
        {canMerge && (
          <Button size="sm" variant="outline" onClick={() => onReview(pair)} className="gap-1.5">
            <GitMerge className="w-4 h-4" /> Review & merge
          </Button>
        )}
      </div>
    </div>
  );
}