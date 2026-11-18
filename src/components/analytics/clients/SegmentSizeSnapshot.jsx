import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";
import { criteriaOf, describeCriteria, filterClients } from "@/components/crm/segmentEngine";

/** Sizes of the saved Phase E segments — evaluated with the same engine the CRM uses. */
export default function SegmentSizeSnapshot({ clients, activityMap }) {
  const { data: segments = [], isLoading } = useQuery({
    queryKey: ["client-segments"],
    queryFn: () => base44.entities.ClientSegment.list("-created_date", 100),
  });

  const rows = segments
    .map((s) => {
      const criteria = criteriaOf(s);
      return {
        id: s.id,
        name: s.name,
        description: describeCriteria(criteria),
        size: filterClients(clients, criteria, activityMap).length,
      };
    })
    .sort((a, b) => b.size - a.size);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-500" /> Saved segments
          {!isLoading && <span className="text-xs font-normal text-slate-500">({rows.length})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">
            No segments saved yet — staff create them in CRM → Segments.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{r.name}</p>
                  <p className="text-xs text-slate-500 truncate">{r.description}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">{r.size.toLocaleString("en-US")}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}