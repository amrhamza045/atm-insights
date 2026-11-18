import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Printer, Pencil, XCircle, Copy } from "lucide-react";
import DepositCreditNotice from "./cancellation/DepositCreditNotice";
import CancelQuoteDialog from "./cancellation/CancelQuoteDialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import QuoteFormDialog from "./QuoteFormDialog";
import CateringDocumentDialog from "./CateringDocumentDialog";
import WhatsAppDocButton from "./WhatsAppDocButton";
import EmailDocButton from "./EmailDocButton";
import KitchenTicketButton from "./KitchenTicketButton";
import { loadTicketPdf } from "./kitchenTicketPdf";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import EventScopeNotice from "./EventScopeNotice";
import { useCateringEditAccess } from "./useCateringEditAccess";
import EventClientQuoteSettings from "./EventClientQuoteSettings";

export default function QuotesTab({ event, autoOpenNew = false, onAutoOpened }) {
  const { canEditRecord } = useCateringEditAccess();
  const canEditEvent = canEditRecord(event);
  const [showForm, setShowForm] = useState(false);
  React.useEffect(() => {
    if (!autoOpenNew || !event?.id) return;
    setShowForm(true);
    onAutoOpened?.();
  }, [autoOpenNew, event?.id]);
  const [editQuote, setEditQuote] = useState(null);
  const [printQuote, setPrintQuote] = useState(null);
  const [dupQuote, setDupQuote] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["catering-quotes", event?.id],
    queryFn: () => base44.entities.CateringQuote.filter({ event_id: event.id }, "-revision_number"),
    enabled: !!event?.id,
  });

  // Packages can be renamed after a quote was built from them — always show the
  // package's current name, falling back to the snapshot for one-off packages.
  const { data: packages = [] } = useQuery({
    queryKey: ["catering-packages"],
    queryFn: () => base44.entities.CateringPackage.list("-created_date", 200),
  });
  // Shares the Payments tab cache key, so submitting a deposit refreshes this lock instantly.
  const { data: payments = [] } = useQuery({
    queryKey: ["catering-payments", event?.id],
    queryFn: () => base44.entities.CateringPayment.filter({ event_id: event.id }, "-payment_date"),
    enabled: !!event?.id,
  });
  const depositLocked = payments.some((p) => p.payment_type === "deposit" && ["pending", "completed"].includes(p.status));
  const packageLabel = (q) => packages.find((p) => p.id === q.package_id)?.name || q.package_name;

  if (!event) return <EventScopeNotice />;

  const activeQuote = quotes.find((q) => q.status === "active") || null;
  const nextRevision = (quotes[0]?.revision_number || 0) + 1;
  // Always edit the freshest copy of the revision, never a stale snapshot.
  const editing = editQuote ? quotes.find((q) => q.id === editQuote.id) || editQuote : null;

  // Cancelling keeps the quote and its payments; any deposit stays on the event as customer credit.
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{quotes.length} quote(s) for <span className="font-medium text-slate-700">{event.event_name}</span></p>
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)} disabled={event.status === "cancelled" || !canEditEvent}>
          <Plus className="w-4 h-4" /> New Quote
        </Button>
      </div>

      <DepositCreditNotice event={event} />
      <CancelQuoteDialog quote={cancelTarget} event={event} onOpenChange={() => setCancelTarget(null)} />

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading quotes…</p>
      ) : quotes.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">No quotes yet for this event.</Card>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => (
            <Card key={q.id} className={`p-4 ${q.status === "active" ? "ring-1 ring-emerald-400" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> Quote {q.revision_number}
                    {q.variant_label && <Badge variant="secondary" className="text-xs">{q.variant_label}</Badge>}
                    {q.package_name && (
                      <Badge variant="outline" className="text-xs">
                        {packageLabel(q)}{q.package_source === "one_off_package" ? " (one-off)" : ""}
                      </Badge>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500">{(q.line_items || []).length} line item(s) · created by {q.created_by_email || "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {q.credit_check_status === "overridden" && <Badge className="bg-red-100 text-red-700">Credit overridden</Badge>}
                  <Badge className={q.quote_cancelled ? "bg-red-100 text-red-700" : q.status === "active" ? "bg-emerald-100 text-emerald-700" : q.status === "pending_approval" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"} title={q.quote_cancelled ? `Cancelled by ${q.cancelled_by || "—"}${q.cancellation_reason ? `: ${q.cancellation_reason}` : ""}` : undefined}>{q.quote_cancelled ? "cancelled" : q.status === "pending_approval" ? "Awaiting approval" : q.status}</Badge>

                  {canEditEvent && event.status !== "cancelled" && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDupQuote(q)}>
                      <Copy className="w-4 h-4" /> Duplicate
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={async () => {
                    const w = window.open("", "_blank");
                    const { pdf } = await loadTicketPdf(event, q, true);
                    pdf.autoPrint();
                    const url = URL.createObjectURL(pdf.output("blob"));
                    if (w) w.location.href = url; else window.open(url, "_blank");
                  }}>
                    <Printer className="w-4 h-4" /> Print
                  </Button>
                  <WhatsAppDocButton type="quotation" event={event} quote={q} />
                  <EmailDocButton type="quotation" event={event} quote={q} />
                  <KitchenTicketButton event={event} quote={q} />
                  {canEditEvent && q.status === "active" && event.status !== "cancelled" && !depositLocked && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditQuote(q)}>
                      <Pencil className="w-4 h-4" /> Edit
                    </Button>
                  )}
                  {!q.quote_cancelled && q.status !== "superseded" && event.status !== "cancelled" && (
                    <Button variant="outline" size="sm" className="gap-1.5 text-red-600" onClick={() => setCancelTarget(q)} disabled={!canEditEvent}>
                      <XCircle className="w-4 h-4" /> Cancel
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600">
                <span>Subtotal: {formatCurrency(q.subtotal || 0, true)}</span>
                <span>Tax: {formatCurrency(q.tax_total || 0, true)}</span>
                <span>Total: <span className="font-semibold text-slate-900">{formatCurrency(q.total || 0, true)}</span></span>
                <span>Deposit: {event?.payment_policy_id ? "per payment policy" : formatCurrency(q.required_deposit || 0, true)}</span>
                <span>Est. cost: {formatCurrency(q.estimated_cost || 0, true)}</span>
                <span>Est. margin: {formatCurrency(q.estimated_margin || 0, true)}{q.estimated_margin_percentage ? ` (${q.estimated_margin_percentage}%)` : ""}</span>
                {q.guests_at_quote > 0 && <span>Scaled to {q.guests_at_quote} guests</span>}
              </div>

              {(q.line_items || []).length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-2 space-y-1">
                  {q.line_items.map((li, i) => (
                    <div key={i} className="flex justify-between text-xs text-slate-600">
                      <span>{li.quantity} × {li.name} {li.item_type === "custom" ? "(bespoke)" : ""}</span>
                      <span>{formatCurrency(li.line_total || 0, true)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <EventClientQuoteSettings event={event} />

      <QuoteFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        event={event}
        nextRevision={nextRevision}
        activeQuote={activeQuote}
      />

      <QuoteFormDialog
        open={!!editing}
        onOpenChange={(v) => !v && setEditQuote(null)}
        event={event}
        nextRevision={nextRevision}
        editQuote={editing}
      />

      <QuoteFormDialog
        open={!!dupQuote}
        onOpenChange={(v) => !v && setDupQuote(null)}
        event={event}
        nextRevision={nextRevision}
        duplicateFrom={dupQuote}
      />

      <CateringDocumentDialog
        open={!!printQuote}
        onOpenChange={(v) => !v && setPrintQuote(null)}
        type="quotation"
        event={event}
        quote={printQuote}
      />
    </div>
  );
}