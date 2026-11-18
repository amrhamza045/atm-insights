import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Receipt } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import CateringDocumentDialog from "@/components/catering/CateringDocumentDialog";
import PortalDepositPanel from "./PortalDepositPanel";
import PortalServiceCostsCard from "./PortalServiceCostsCard";
import usePortalServiceCosts from "./usePortalServiceCosts";
import PortalApprovalPanel from "./PortalApprovalPanel";
import PortalTransferProofTab from "./PortalTransferProofTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePortalQuoteSettings } from "@/components/catering/usePortalQuoteSettings";
import PortalQuoteCard from "./PortalQuoteCard";

/**
 * Read-only customer view of one event: its active quote, its payment history and
 * the printable documents from Phase 10. Nothing here writes.
 */
export default function PortalEventDetail({ event }) {
  const [docType, setDocType] = useState(null);

  const { data: quotes = [] } = useQuery({
    queryKey: ["portal-quotes", event.id],
    queryFn: () => base44.entities.CateringQuote.filter({ event_id: event.id }),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["portal-payments", event.id],
    queryFn: () => base44.entities.CateringPayment.filter({ event_id: event.id }, "-payment_date"),
  });
  const { data: reconciliations = [] } = useQuery({
    queryKey: ["portal-reconciliation", event.id],
    queryFn: () => base44.entities.CateringReconciliation.filter({ event_id: event.id }),
  });

  const { data: serviceCosts } = usePortalServiceCosts(event.id);
  const { vis } = usePortalQuoteSettings(event.id);

  const quote = quotes.find((q) => q.id === event.active_quote_id) || quotes.find((q) => q.status === "active") || null;
  const reconciliation = reconciliations[0] || null;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-lg font-semibold text-slate-900">{event.event_name}</p>
            <p className="text-sm text-slate-500">
              {event.event_date}{event.start_time ? ` · ${event.start_time}` : ""}{event.end_time ? `–${event.end_time}` : ""} ·{" "}
              {event.location_type === "off_site" ? event.venue_name || "Off-site venue" : event.branch_name || "At the restaurant"}
            </p>
          </div>
          <Badge className="bg-slate-100 text-slate-700">{(event.status || "").replace(/_/g, " ")}</Badge>
        </div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><p className="text-xs text-slate-500">Guests</p><p className="font-medium">{event.expected_guests || 0}</p></div>
          <div><p className="text-xs text-slate-500">Quote total</p><p className="font-medium">{formatCurrency(event.quote_total || 0, true)}</p></div>
          <div><p className="text-xs text-slate-500">Paid</p><p className="font-medium">{formatCurrency(event.total_paid || 0, true)}</p></div>
          {vis.portal_show_balance_due && (
            <div><p className="text-xs text-slate-500">Balance</p><p className="font-medium">{formatCurrency(event.balance_due || 0, true)}</p></div>
          )}
        </div>
      </Card>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
        </TabsList>

        <TabsContent value="transfers" className="mt-4">
          <PortalTransferProofTab event={event} />
        </TabsContent>

        <TabsContent value="details" className="mt-4 space-y-4">
      <PortalQuoteCard
        quote={quote}
        vis={vis}
        serviceTotal={serviceCosts?.grand_total || 0}
        guests={event.expected_guests || 0}
      />

      {vis.portal_show_service_costs && <PortalServiceCostsCard event={event} />}

      <PortalApprovalPanel event={event} quote={quote} serviceTotal={serviceCosts?.grand_total || 0} />

      <PortalDepositPanel event={event} quote={quote} />

      <Card className="p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">Payments & documents</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDocType("quotation")}><FileText className="w-4 h-4" /> Quotation</Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDocType("deposit_receipt")}><Receipt className="w-4 h-4" /> Deposit receipt</Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDocType("invoice")}><FileText className="w-4 h-4" /> Invoice</Button>
            {reconciliation?.status === "finalized" && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDocType("final_invoice")}><FileText className="w-4 h-4" /> Final invoice</Button>
            )}
          </div>
        </div>
        {!vis.portal_show_payment_history ? null : payments.length === 0 ? (
          <p className="text-sm text-slate-500">No payments recorded yet.</p>
        ) : (
          <div className="rounded-lg border divide-y">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-900 capitalize">{(p.payment_type || "").replace(/_/g, " ")}</p>
                  <p className="text-xs text-slate-500">
                    {(p.payment_method || "").replace(/_/g, " ")} · {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "—"}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </p>
                </div>
                <span className={`font-semibold ${p.payment_type === "refund" ? "text-red-600" : "text-emerald-600"}`}>
                  {formatCurrency(p.amount, true)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
        </TabsContent>
      </Tabs>

      <CateringDocumentDialog
        open={!!docType}
        onOpenChange={(o) => !o && setDocType(null)}
        type={docType || "quotation"}
        event={event}
        quote={quote}
        payments={payments}
        reconciliation={reconciliation}
        serviceCosts={serviceCosts}
      />
    </div>
  );
}