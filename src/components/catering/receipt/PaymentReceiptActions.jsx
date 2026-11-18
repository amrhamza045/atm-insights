import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { receiptCall, openPdf, RECEIPT_TYPE_LABELS } from "./receiptApi";
import ReceiptSendButton from "./ReceiptSendButton";

const RECEIPT_TYPES = Object.keys(RECEIPT_TYPE_LABELS);

function hint(payment, autoOn) {
  const last = payment.receipt_email_at ? new Date(payment.receipt_email_at).toLocaleString() : "";
  const lines = [];
  if (payment.receipt_email_status === "sent") lines.push(`Receipt emailed to ${payment.receipt_email_to} on ${last} (${payment.receipt_email_trigger === "auto" ? "automatically" : `by ${payment.receipt_email_by}`}).`);
  if (payment.receipt_email_status === "failed") lines.push(`Last attempt on ${last} failed: ${payment.receipt_email_error}`);
  if (!payment.receipt_email_status && autoOn) lines.push("Automatic receipts are on for this payment type, but none was sent for this payment.");
  lines.push(autoOn
    ? "Emails the PDF receipt to the client's email on record, in the receipt language from Catering › Settings."
    : "Automatic receipts are off for this payment type. Choose English or Arabic to email the PDF receipt to the client's email on record.");
  return lines.join(" ");
}

/** Download / email the client PDF receipt of an approved client payment. */
export default function PaymentReceiptActions({ payment, canSend }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(null);
  const { data: auto } = useQuery({ queryKey: ["catering-receipt-auto"], queryFn: () => receiptCall("auto_status"), staleTime: 60000 });
  if (payment.status !== "completed" || payment.credit_note || !RECEIPT_TYPES.includes(payment.payment_type)) return null;
  const autoOn = !!auto?.auto_send && !!auto.auto_send_types?.includes(payment.payment_type);

  const run = async (action, lang) => {
    setBusy(action);
    try {
      if (action === "download") {
        const { files } = await receiptCall("download", { payment_id: payment.id });
        files.forEach((f) => openPdf(f, true));
      } else {
        const result = await receiptCall("send", { payment_id: payment.id, ...(lang ? { lang } : {}) });
        toast.success(`Receipt emailed to ${result.to}`);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(null);
      if (action === "send") queryClient.invalidateQueries({ queryKey: ["catering-payments", payment.event_id] });
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" className="h-7 px-2" disabled={!!busy} onClick={() => run("download")} title="Download receipt PDF">
          {busy === "download" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        </Button>
        {canSend && <ReceiptSendButton payment={payment} autoOn={autoOn} hint={hint(payment, autoOn)} busy={busy} onSend={(lang) => run("send", lang)} />}
      </div>
    </TooltipProvider>
  );
}