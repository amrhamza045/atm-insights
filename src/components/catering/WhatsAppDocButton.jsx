import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import WhatsAppSendDialog from "./WhatsAppSendDialog";
import { buildCateringDocData } from "./cateringDocData";
import { sendCateringDocumentWhatsApp } from "./sendCateringDocumentWhatsApp";

/**
 * Sends a catering document to the client on WhatsApp as a PDF attachment.
 * The PDF is regenerated and re-uploaded on every send, so a later click can
 * never deliver superseded pricing.
 */
export default function WhatsAppDocButton({ type, event, quote, payments = [], reconciliation, serviceCosts = null }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: branding } = useQuery({
    queryKey: ["restaurantInfo"],
    queryFn: async () => {
      const list = await base44.entities.RestaurantInfo.list();
      return list[0] || null;
    },
    enabled: open,
  });

  const send = async (lang, phone) => {
    setSending(true);
    try {
      const docData = buildCateringDocData({ type, event, quote, payments, reconciliation, serviceCosts });
      await sendCateringDocumentWhatsApp({ lang, phone, type, event, docData, quote, reconciliation, branding });
      toast.success(`Sent to ${phone} on WhatsApp`);
      setOpen(false);
    } catch (e) {
      toast.error(e?.message || "Could not send on WhatsApp");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 text-green-700" onClick={() => setOpen(true)}>
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />} WhatsApp
      </Button>
      <WhatsAppSendDialog
        open={open}
        onOpenChange={(o) => !o && !sending && setOpen(false)}
        defaultPhone={event.client_phone}
        sending={sending}
        onSend={send}
      />
    </>
  );
}