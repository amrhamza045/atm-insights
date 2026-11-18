import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PartyPopper } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/components/utils/currencyFormatter";

export default function CateringHistoryCard({ events = [], isLoading }) {
  const total = events.reduce((s, e) => s + (Number(e.quote_total) || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PartyPopper className="w-4 h-4 text-slate-500" /> Catering Events
          {!isLoading && <span className="text-xs font-normal text-slate-500">({events.length} · {formatCurrency(total, true)})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-500">No catering events for this client.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-slate-900 truncate">{e.event_name}</p>
                  <p className="text-xs text-slate-500">
                    {e.event_date ? format(new Date(e.event_date), "dd MMM yyyy") : "—"} · {e.expected_guests || 0} guests · {e.branch_name || "—"}
                  </p>
                </div>
                <div className="text-right whitespace-nowrap">
                  <p className="text-sm font-medium">{formatCurrency(e.quote_total || 0, true)}</p>
                  <Badge variant="outline" className="text-xs">{e.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}