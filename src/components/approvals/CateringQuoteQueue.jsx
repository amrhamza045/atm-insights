import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { afterRevisionApproved } from "@/components/catering/revisionHoldReset";

export function usePendingQuotes() {
  return useQuery({
    queryKey: ["catering-quotes", "pending_approval"],
    queryFn: () => base44.entities.CateringQuote.filter({ status: "pending_approval" }, "-created_date", 100),
  });
}

export default function CateringQuoteQueue() {
  const { data: quotes = [] } = usePendingQuotes();
  const [busy, setBusy] = useState(null);
  const queryClient = useQueryClient();

  const decide = async (quote, decision) => {
    setBusy(quote.id);
    try {
      const res = await base44.functions.invoke("reviewCateringQuote", { quote_id: quote.id, decision }).catch((e) => e.response || { data: { error: e.message } });
      if (res.data?.error) { toast.error(res.data.error); return; }
      if (decision === "approve" && res.data.covered === false) {
        toast.error(`Deposit no longer covers this quote: ${Number(res.data.required).toLocaleString()} EGP required.`);
      }
      toast.success(decision === "approve" ? `Quote ${quote.revision_number} is now active` : `Quote ${quote.revision_number} rejected`);
      if (decision === "approve") {
        await afterRevisionApproved({ eventId: quote.event_id, previousQuoteId: res.data.previous_quote_id, quoteId: quote.id });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catering-quotes"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-events"] }),
      ]);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
        <FileText className="w-5 h-5 text-amber-500" /> Catering Quotes ({quotes.length})
      </h2>
      {quotes.length === 0 && <p className="text-sm text-slate-500">No quotes awaiting approval.</p>}
      <div className="space-y-3">
        {quotes.map((q) => (
          <Card key={q.id} className="p-4 flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900 truncate">{q.event_name} · Quote {q.revision_number}</p>
                <Badge className="bg-amber-100 text-amber-800">Awaiting approval</Badge>
              </div>
              <p className="text-sm text-slate-500">{q.client_name} · {(q.line_items || []).length} lines · prepared by {q.created_by_email || "—"}</p>
              <p className="text-sm font-medium">{formatCurrency(q.total, true)}</p>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline"><Link to="/Catering">Open in Catering</Link></Button>
              <Button size="sm" className="gap-1.5" disabled={busy === q.id} onClick={() => decide(q, "approve")}><Check className="w-4 h-4" /> Approve</Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-red-600" disabled={busy === q.id} onClick={() => decide(q, "reject")}><X className="w-4 h-4" /> Reject</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}