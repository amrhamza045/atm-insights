import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import PortalTransferProofForm from "./PortalTransferProofForm";
import ReceiptLink from "@/components/shared/ReceiptLink";

const STATUS_STYLES = {
  pending: "bg-warning-100 text-warning-800",
  verified: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

/** Customer tab: upload a transfer screenshot and see the ones already submitted. */
export default function PortalTransferProofTab({ event }) {
  const { data: proofs = [] } = useQuery({
    queryKey: ["portal-transfer-proofs", event.id],
    queryFn: () => base44.entities.CateringTransferProof.filter({ event_id: event.id }, "-created_date"),
  });

  const depositDue = Math.max(0, (event.required_deposit_amount || 0) - (event.deposit_paid_amount || 0));
  const fullDue = event.balance_due || 0;

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <Receipt className="w-4 h-4" /> Send us your transfer
          </p>
          <p className="text-sm text-slate-500">
            Upload a screenshot of your deposit transfer or of the full amount transfer, and we'll verify it.
          </p>
        </div>
        <PortalTransferProofForm event={event} depositDue={depositDue} fullDue={fullDue} />
      </Card>

      <Card className="p-4 space-y-2">
        <p className="text-sm font-semibold text-slate-900">Transfers you've submitted</p>
        {proofs.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing submitted yet.</p>
        ) : (
          <div className="rounded-lg border divide-y">
            {proofs.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {p.transfer_type === "full_amount" ? "Full amount" : "Deposit"} · {formatCurrency(p.amount || 0, true)}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {(p.method || "").replace(/_/g, " ")}
                    {p.transfer_date ? ` · ${p.transfer_date}` : ""}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </p>
                  {p.review_note && <p className="text-xs text-slate-500">Note from us: {p.review_note}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {p.screenshot_url && (
                    <ReceiptLink value={p.screenshot_url} className="text-xs text-blue-600 underline">View</ReceiptLink>
                  )}
                  <Badge className={STATUS_STYLES[p.status] || "bg-slate-100 text-slate-700"}>{p.status || "pending"}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}