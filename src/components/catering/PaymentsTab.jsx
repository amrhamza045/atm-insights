import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ReceiptLink from "@/components/shared/ReceiptLink";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, FileText, Receipt, FileMinus, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/components/utils/currencyFormatter";
import { round2 } from "./cateringLogic";
import { useBranch } from "@/components/branches/BranchContext";
import EventScopeNotice from "./EventScopeNotice";
import { Link } from "react-router-dom";
import { usePermissions, useIsAdmin } from "@/components/permissions/PermissionsContext";
import VoidPaymentDialog from "./VoidPaymentDialog";
import { canIssueCreditNote } from "./cateringGuards";
import { useSelfApprovalBypass } from "@/components/approvals/useSelfApproval";
import CateringDocumentDialog from "./CateringDocumentDialog";
import CreditNoteDialog from "./CreditNoteDialog";
import DepositWithdrawalDialog from "./DepositWithdrawalDialog";
import useEventServiceTotals from "./useEventServiceTotals";
import PaymentProofUpload from "./PaymentProofUpload";
import DepositFloorWarning from "./DepositFloorWarning";
import DepositPercentField from "./DepositPercentField";
import { eventTotal } from "./serviceBilling";
import CateringPaymentReviewActions from '@/components/catering/CateringPaymentReviewActions';
import EventPaymentScheduleCard from "./payment-policies/EventPaymentScheduleCard";
import { autoApproveReservation } from "./autoApproveReservation";
import { autoStartOperations, OPERATIONS_QUERY_KEYS } from "./confirm/autoStartOperations";
import PaymentDecisionDetails from '@/components/catering/PaymentDecisionDetails';
import PaymentEntryForm from "./PaymentEntryForm";
import DepositCreditNotice from "./cancellation/DepositCreditNotice";
import PaymentReceiptActions from "./receipt/PaymentReceiptActions";

import { useCateringEditAccess } from "./useCateringEditAccess";

export default function PaymentsTab({ event }) {
  const { canEditRecord, canFinanceRecord } = useCateringEditAccess();
  const canWrite = canEditRecord(event);
  const canFinance = canFinanceRecord(event);
  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();
  const { permissions, currentUser } = usePermissions();
  const selfBypass = useSelfApprovalBypass();
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState(null);
  const [showCreditNote, setShowCreditNote] = useState(false);
  const [voiding, setVoiding] = useState(null);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const isAdmin = useIsAdmin();

  const { data: quotes = [] } = useQuery({
    queryKey: ["catering-quotes", event?.id],
    queryFn: () => base44.entities.CateringQuote.filter({ event_id: event.id }),
    enabled: !!event?.id,
  });
  const { data: reconciliations = [] } = useQuery({
    queryKey: ["catering-reconciliation", event?.id],
    queryFn: () => base44.entities.CateringReconciliation.filter({ event_id: event.id }),
    enabled: !!event?.id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["catering-payments", event?.id],
    queryFn: () => base44.entities.CateringPayment.filter({ event_id: event.id }, "-payment_date"),
    enabled: !!event?.id,
  });

  const service = useEventServiceTotals(event?.id);

  if (!event) return <EventScopeNotice />;

  const grandTotal = eventTotal(event, service.total);

  const activeQuote = quotes.find((q) => q.id === event.active_quote_id) || quotes.find((q) => q.status === "active") || null;
  // Incoming payments can never exceed what is still owed; refunds never exceed what was paid.
  const outstanding = round2(Math.max(0, grandTotal - (event.total_paid || 0)));
  const creditNote = canIssueCreditNote({ permissions, currentUser, quote: activeQuote, selfBypass });
  const excessDeposit = round2((event.deposit_paid_amount || 0) - (event.required_deposit_amount || 0));

  return (
    <div className="space-y-4">
      {payments.some((p) => p.status === "pending") && (
        <Card className="p-3 text-sm border-amber-200 bg-amber-50 text-amber-900">
          This event has {payments.filter((p) => p.status === "pending").length} request(s) awaiting approval in the <Link to="/Approvals" className="underline font-medium">Approvals Center</Link>.
        </Card>
      )}

      {event.status === "deposit_pending_verification" && (
        <Card className="p-3 border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Customer says the deposit was sent — verify before recording</p>
          <p className="text-amber-800">
            {formatCurrency(event.deposit_declared_amount || 0, true)} by {(event.deposit_declared_method || "").replace(/_/g, " ")}
            {event.deposit_declared_reference ? ` · ref ${event.deposit_declared_reference}` : ""}
            {event.deposit_declared_date ? ` · declared ${new Date(event.deposit_declared_date).toLocaleString()}` : ""}
          </p>
        </Card>
      )}

      <DepositCreditNotice event={event} />

      <EventPaymentScheduleCard event={event} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge className="bg-slate-100 text-slate-700">Deposit: {event.deposit_status}</Badge>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDocType("quotation")}><FileText className="w-4 h-4" /> Quotation</Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDocType("deposit_receipt")}><Receipt className="w-4 h-4" /> Deposit receipt</Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDocType("invoice")}><FileText className="w-4 h-4" /> Invoice</Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDocType("final_invoice")}><FileText className="w-4 h-4" /> Final invoice</Button>
          {canFinance && <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-red-600"
            disabled={!creditNote.allowed}
            title={creditNote.reason}
            onClick={() => (creditNote.allowed ? setShowCreditNote(true) : toast.error(creditNote.reason))}
          >
            <FileMinus className="w-4 h-4" /> Credit note
          </Button>}
          {canFinance && excessDeposit > 0 && <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-blue-700"
            disabled={!creditNote.allowed}
            title={creditNote.allowed ? "" : "You priced this event — a second Catering Manager or an admin must withdraw the deposit."}
            onClick={() => setShowWithdraw(true)}
          >
            <Undo2 className="w-4 h-4" /> Withdraw excess deposit
          </Button>}
          {canFinance && <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Record Payment</Button>}
        </div>
      </div>

      {payments.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">No catering payments recorded for this event.</Card>
      ) : (
        <Card className="divide-y">
          {payments.filter((p) => p.status !== "pending").map((p) => (
            <div key={p.id} className="p-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium text-slate-900 capitalize flex items-center gap-2">
                  {p.payment_type.replace(/_/g, " ")}
                  {p.payment_type === "deposit_withdrawal" && <Badge className="bg-blue-100 text-blue-700 normal-case">{p.status === 'completed' ? 'Withdrawn' : 'Deposit withdrawal'}</Badge>}
                </div>
                {p.payment_type === "deposit_withdrawal" && p.notes && <p className="text-xs text-blue-700">{p.notes}</p>}
                <p className="text-xs text-slate-500">{p.payment_method} · {p.payment_date ? new Date(p.payment_date).toLocaleString() : "—"} · {p.recorded_by}</p>
                {p.reference && <p className="text-xs text-muted-foreground">Reference: {p.reference}</p>}
                {p.receipt_url && (
                  <ReceiptLink value={p.receipt_url} className="text-xs text-blue-600 underline">View proof</ReceiptLink>
                )}
                <PaymentDecisionDetails payment={p} />
              </div>
              <div className="flex items-center gap-2">
                <PaymentReceiptActions payment={p} canSend={canFinance} />
                {p.status === "voided" ? (
                  <Badge className="bg-slate-200 text-slate-700" title={p.void_reason}>Voided</Badge>
                ) : p.status === "pending" ? (
                  <Badge className="bg-amber-100 text-amber-800">Pending approval</Badge>
                ) : p.status === "rejected" ? (
                  <Badge className="bg-red-100 text-red-700" title={p.rejection_reason}>Rejected</Badge>
                ) : (
                  canFinance && (isAdmin || p.recorded_by !== currentUser?.email) && <Button size="sm" variant="ghost" className="text-red-600 h-7" onClick={() => setVoiding(p)}>Void</Button>
                )}
                <span className={`font-semibold ${["voided", "rejected"].includes(p.status) ? "line-through text-slate-400" : p.status === 'pending' ? 'text-muted-foreground' : p.payment_type === "refund" || p.payment_type === "deposit_withdrawal" ? "text-red-600" : "text-emerald-600"}`}>
                  {formatCurrency(p.amount, true)}
                </span>
              </div>
            </div>
          ))}
        </Card>
      )}

      <CateringDocumentDialog
        open={!!docType}
        onOpenChange={(o) => !o && setDocType(null)}
        type={docType || "quotation"}
        event={event}
        quote={activeQuote}
        payments={payments}
        reconciliation={reconciliations[0] || null}
        serviceCosts={service.lines}
      />
      <VoidPaymentDialog payment={voiding} event={event} onClose={() => setVoiding(null)} />
      <CreditNoteDialog open={showCreditNote} onOpenChange={setShowCreditNote} event={event} />
      <DepositWithdrawalDialog open={showWithdraw} onOpenChange={setShowWithdraw} event={event} excess={Math.max(0, excessDeposit)} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Submit Catering Payment for Approval</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Balances, deposit coverage and accounting entries remain unchanged until another authorized user approves.</p>
          <PaymentEntryForm event={event} onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}