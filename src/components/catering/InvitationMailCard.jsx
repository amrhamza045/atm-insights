import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_EMAIL_SUBJECT,
  DEFAULT_EMAIL_BODY,
  DEFAULT_EMAIL_SUBJECT_AR,
  DEFAULT_EMAIL_BODY_AR,
} from "./invitationSend";

const PLACEHOLDERS = ["{{guest_name}}", "{{event_name}}", "{{when}}", "{{where}}", "{{seats}}", "{{link}}"];

const FIELDS = {
  en: { subject: "email_subject", body: "email_body", defSubject: DEFAULT_EMAIL_SUBJECT, defBody: DEFAULT_EMAIL_BODY },
  ar: { subject: "email_subject_ar", body: "email_body_ar", defSubject: DEFAULT_EMAIL_SUBJECT_AR, defBody: DEFAULT_EMAIL_BODY_AR },
};

/** Invitation message template, kept per language and picked by the language
 *  chosen when guests are invited. */
export default function InvitationMailCard() {
  const queryClient = useQueryClient();
  const [lang, setLang] = useState("en");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: branding } = useQuery({
    queryKey: ["catering-pass-branding"],
    queryFn: async () => (await base44.entities.CateringPassBranding.list())[0] || null,
  });

  const f = FIELDS[lang];

  useEffect(() => {
    setSubject(branding?.[f.subject] || f.defSubject);
    setBody(branding?.[f.body] || f.defBody);
  }, [branding, lang, f.subject, f.body, f.defSubject, f.defBody]);

  const save = async () => {
    setBusy(true);
    try {
      const payload = { [f.subject]: subject, [f.body]: body };
      if (branding) await base44.entities.CateringPassBranding.update(branding.id, payload);
      else await base44.entities.CateringPassBranding.create(payload);
      queryClient.invalidateQueries({ queryKey: ["catering-pass-branding"] });
      toast.success(`${lang === "ar" ? "Arabic" : "English"} invitation template saved`);
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900">Invitation mail</h3>
        <p className="text-sm text-slate-500">
          Used for email, WhatsApp and SMS invitations, per language. Placeholders: {PLACEHOLDERS.join("  ")}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Template language</Label>
        <div className="grid grid-cols-2 gap-2 max-w-xs">
          <Button variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>English</Button>
          <Button variant={lang === "ar" ? "default" : "outline"} onClick={() => setLang("ar")}>العربية</Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Subject</Label>
        <Input dir={lang === "ar" ? "rtl" : "ltr"} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Body</Label>
        <Textarea dir={lang === "ar" ? "rtl" : "ltr"} rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => { setSubject(f.defSubject); setBody(f.defBody); }}>
          Reset to default text
        </Button>
      </div>
    </Card>
  );
}