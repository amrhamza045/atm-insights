import React, { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import EmailSendDialog from "./EmailSendDialog";
import { buildCateringDocData } from "./cateringDocData";
import { sendCateringDocumentEmail } from "./sendCateringDocumentEmail";
import { buildDocEmailVars, fillTemplate, resolveDocTemplate } from "./docEmailTemplate";

/**
 * Emails a catering document to the client as a freshly generated PDF link,
 * using the admin-managed template that staff can tweak before sending.
 */
export default function EmailDocButton({ type, event, quote, payments = [], reconciliation, serviceCosts = null }) {
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

  const { data: mailConfig } = useQuery({
    queryKey: ["catering-pass-branding"],
    queryFn: async () => (await base44.entities.CateringPassBranding.list())[0] || null,
    enabled: open,
  });

  // The event stores only the client's phone — the address lives on the client record.
  const { data: client } = useQuery({
    queryKey: ["client-record", event.client_id],
    queryFn: () => base44.entities.Client.get(event.client_id),
    enabled: open && !!event.client_id,
  });

  const docData = buildCateringDocData({ type, event, quote, payments, reconciliation, serviceCosts });

  const buildDraft = useCallback(
    (lang) => {
      const vars = buildDocEmailVars({ lang, type, event, docData, branding });
      const tpl = resolveDocTemplate(mailConfig, lang);
      return { subject: fillTemplate(tpl.subject, vars), body: fillTemplate(tpl.body, vars) };
    },
    [type, event, docData, branding, mailConfig]
  );

  const send = async ({ lang, email, subject, body }) => {
    setSending(true);
    try {
      await sendCateringDocumentEmail({ lang, email, type, event, docData, quote, reconciliation, branding, subject, body });
      toast.success(`Emailed to ${email}`);
      setOpen(false);
    } catch (e) {
      toast.error(e?.message || "Could not send the email");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 text-blue-700" onClick={() => setOpen(true)}>
        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Email
      </Button>
      {open && (
        <EmailSendDialog
          open={open}
          onOpenChange={(o) => !o && !sending && setOpen(false)}
          defaultEmail={client?.email || ""}
          sending={sending}
          onSend={send}
          buildDraft={buildDraft}
        />
      )}
    </>
  );
}