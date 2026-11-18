import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { logEventAudit } from "../eventAudit";

// Cancelling keeps the quote and its payments; any deposit stays on the event as customer credit.
export default function CancelQuoteDialog({ quote, event, onOpenChange }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const paid = Number(event?.total_paid) || 0;

  const close = () => { setReason(""); onOpenChange(false); };

  const confirm = async () => {
    setSaving(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.CateringQuote.update(quote.id, {
        status: "superseded",
        quote_cancelled: true,
        cancelled_by: user?.email || "",
        cancelled_date: new Date().toISOString(),
        cancellation_reason: reason,
      });
      logEventAudit("update", event, `Cancelled quote ${quote.revision_number}: ${reason || "no reason given"}`, { quote_status: { from: quote.status, to: "cancelled" } });
      if (event.active_quote_id === quote.id) {
        await base44.entities.CateringEvent.update(event.id, { active_quote_id: "", active_quote_revision: 0, quote_total: 0, required_deposit_amount: 0, balance_due: 0 });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catering-quotes"] }),
        queryClient.invalidateQueries({ queryKey: ["catering-events"] }),
      ]);
      toast.success("Quote cancelled");
      close();
    } catch {
      toast.error("Could not cancel the quote");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!quote} onOpenChange={(o) => !o && !saving && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel quote {quote?.revision_number}{quote?.package_name ? ` · ${quote.package_name}` : ""}</DialogTitle>
          <DialogDescription>Quote total {formatCurrency(quote?.total || 0, true)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <ul className="list-disc ps-5 space-y-1 text-slate-600">
            <li>The quote stays in the history, marked cancelled.</li>
            <li>The event keeps running; create a new quote whenever you are ready.</li>
          </ul>
          {paid > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-900">
              <Wallet className="w-4 h-4 mt-0.5" />
              <span><span className="font-semibold">{formatCurrency(paid, true)}</span> already paid stays on this event as customer credit and counts toward the next quote.</span>
            </div>
          )}
          <div>
            <Label>Reason (optional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Client changed the menu" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={saving}>Keep quote</Button>
          <Button variant="destructive" onClick={confirm} disabled={saving}>{saving ? "Cancelling…" : "Cancel quote"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}