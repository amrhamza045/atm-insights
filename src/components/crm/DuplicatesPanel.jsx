import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Loader2 } from "lucide-react";
import { findDuplicatePairs, summarizePairs } from "./duplicateDetection";
import DuplicatePairRow from "./DuplicatePairRow";
import MergeClientsDialog from "./MergeClientsDialog";

export default function DuplicatesPanel({ canMerge }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [activePair, setActivePair] = useState(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date", 2000)
  });

  const pairs = useMemo(() => findDuplicatePairs(clients), [clients]);
  const stats = summarizePairs(pairs);
  const visible = filter === "all" ? pairs : pairs.filter((p) => p.confidence === filter);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" /> Duplicate candidates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-slate-50">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-slate-500">candidate pairs</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50">
              <p className="text-2xl font-bold text-red-700">{stats.high}</p>
              <p className="text-xs text-red-600">high confidence (same phone/email)</p>
            </div>
            <div className="p-3 rounded-lg bg-warning-50">
              <p className="text-2xl font-bold text-warning-700">{stats.medium}</p>
              <p className="text-xs text-warning-600">needs review (name match only)</p>
            </div>
          </div>

          <div className="flex gap-2">
            {["all", "high", "medium"].map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "high" ? "High confidence" : "Needs review"}
              </Button>
            ))}
          </div>

          {!canMerge && (
            <p className="text-xs text-slate-500 mt-3">
              You can review candidates, but merging requires the client-merge permission.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {visible.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No duplicate candidates in this view.</p>
        ) : (
          visible.map((pair) => (
            <DuplicatePairRow key={pair.id} pair={pair} canMerge={canMerge} onReview={setActivePair} />
          ))
        )}
      </div>

      {activePair && (
        <MergeClientsDialog
          pair={activePair}
          open={!!activePair}
          onOpenChange={(o) => !o && setActivePair(null)}
          onMerged={() => queryClient.invalidateQueries({ queryKey: ["clients"] })}
        />
      )}
    </div>
  );
}