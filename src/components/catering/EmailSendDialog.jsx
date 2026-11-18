import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";

/**
 * Confirms the recipient email (pre-filled from the event), the document
 * language, and the message itself — pre-filled from the admin template and
 * editable for this one send. {{link}} becomes the generated PDF link.
 */
export default function EmailSendDialog({ open, onOpenChange, defaultEmail, sending, onSend, buildDraft }) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [lang, setLang] = useState("en");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (open) setEmail(defaultEmail || "");
  }, [open, defaultEmail]);

  // Re-resolve the template whenever the dialog opens or the language changes.
  useEffect(() => {
    if (!open) return;
    const draft = buildDraft(lang);
    setSubject(draft.subject);
    setBody(draft.body);
  }, [open, lang, buildDraft]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send by email</DialogTitle>
          <DialogDescription>Review the message before it goes out — the PDF link replaces {"{{link}}"}.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="doc-email">Client email</Label>
            <Input id="doc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" />
            {defaultEmail && email !== defaultEmail && (
              <p className="text-xs text-amber-600">Different from the event address ({defaultEmail}) — used for this send only.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Document language</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>English</Button>
              <Button variant={lang === "ar" ? "default" : "outline"} onClick={() => setLang("ar")}>العربية</Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button className="gap-1.5" disabled={!email.trim() || sending} onClick={() => onSend({ lang, email: email.trim(), subject, body })}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}