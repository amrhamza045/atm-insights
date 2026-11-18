import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

/** Email / resend button. With automatic receipts off for this payment type, staff pick the language first. */
export default function ReceiptSendButton({ payment, autoOn, hint, busy, onSend }) {
  const sent = payment.receipt_email_status === "sent", failed = payment.receipt_email_status === "failed";
  const icon = busy === "send" ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
    : sent ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
    : failed ? <AlertCircle className="w-3.5 h-3.5 text-red-600" />
    : <Mail className="w-3.5 h-3.5" />;
  const button = (
    <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" disabled={!!busy} onClick={autoOn ? () => onSend() : undefined}>
      {icon}
      {sent ? "Resend receipt" : "Email receipt"}
    </Button>
  );
  const tip = <TooltipContent className="max-w-xs text-xs leading-relaxed">{hint}</TooltipContent>;

  if (autoOn) return <Tooltip><TooltipTrigger asChild>{button}</TooltipTrigger>{tip}</Tooltip>;
  return (
    <DropdownMenu modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
        </TooltipTrigger>
        {tip}
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Send the receipt in</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onSend("en")}>English</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSend("ar")}>العربية (Arabic)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}