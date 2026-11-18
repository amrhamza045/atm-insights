import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

/**
 * Confirms the recipient number (pre-filled from the event, editable for a
 * one-off send) and the document language before sending on WhatsApp.
 */
export default function WhatsAppSendDialog({ open, onOpenChange, defaultPhone, sending, onSend, singleSend = false }) {
  const [phone, setPhone] = useState(defaultPhone || "");

  useEffect(() => {
    if (open) setPhone(defaultPhone || "");
  }, [open, defaultPhone]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Send on WhatsApp</DialogTitle>
          <DialogDescription>Confirm the number from the event, or edit it for this send.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="wa-phone">Client number</Label>
          <Input id="wa-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" />
          {defaultPhone && phone !== defaultPhone && (
            <p className="text-xs text-amber-600">Different from the event number ({defaultPhone}) — used for this send only.</p>
          )}
        </div>

        {singleSend ? (
          <Button className="w-full h-11" disabled={!phone.trim() || sending} onClick={() => onSend("en", phone.trim())}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
          </Button>
        ) : (<>
        <p className="text-xs text-slate-500 pt-1">Which language should the document be in?</p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12" disabled={!phone.trim() || sending} onClick={() => onSend("en", phone.trim())}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "English"}
          </Button>
          <Button variant="outline" className="h-12" disabled={!phone.trim() || sending} onClick={() => onSend("ar", phone.trim())}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "العربية"}
          </Button>
        </div>
        </>)}
      </DialogContent>
    </Dialog>
  );
}