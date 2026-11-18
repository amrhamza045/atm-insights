import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ChefHat, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import WhatsAppSendDialog from "./WhatsAppSendDialog";
import { loadTicketPdf as loadTicket } from "./kitchenTicketPdf";

/** Kitchen-only ticket (no prices): download, or send the PDF to a kitchen phone on WhatsApp. */
export default function KitchenTicketButton({ event, quote }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try { const { pdf, filename } = await loadTicket(event, quote); pdf.save(filename); }
    finally { setBusy(false); }
  };

  const send = async (_lang, phone) => {
    setBusy(true);
    try {
      const { pdf, filename } = await loadTicket(event, quote);
      const file = new File([pdf.output("blob")], filename, { type: "application/pdf" });
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      await base44.functions.invoke("sendWhatsAppMessage", {
        phone_number: phone,
        message: `Kitchen ticket — ${event.event_name} (${event.event_date})`,
        media_url: file_url,
      });
      toast.success(`Kitchen ticket sent to ${phone}`);
      setOpen(false);
    } catch (e) {
      const d = e?.response?.data;
      toast.error(d?.error ? `${d.error}${d.details?.message ? `: ${d.details.message}` : ""}` : e?.message || "Could not send the kitchen ticket");
    } finally { setBusy(false); }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={download} disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Kitchen PDF
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5 text-green-700" onClick={() => setOpen(true)} disabled={busy}>
        <ChefHat className="w-4 h-4" /> Kitchen WhatsApp
      </Button>
      <WhatsAppSendDialog open={open} onOpenChange={(o) => !o && !busy && setOpen(false)} defaultPhone="" sending={busy} onSend={send} singleSend />
    </>
  );
}