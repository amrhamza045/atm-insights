import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Mail, User, MessageCircle } from "lucide-react";

export default function LeadContactDialog({ lead, onOpenChange }) {
  if (!lead) return null;
  const wa = lead.phone ? `https://wa.me/${lead.phone.replace(/\D/g, "")}` : null;
  return (
    <Dialog open={!!lead} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><User className="w-4 h-4" />{lead.sender_name || "Contact"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" />{lead.phone || "Not provided"}</p>
          <p className="flex items-center gap-2 break-all"><Mail className="w-4 h-4 text-slate-400" />{lead.email || "Not provided"}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2">
          <Button asChild variant="outline" size="sm" disabled={!lead.phone}><a href={lead.phone ? `tel:${lead.phone}` : undefined}><Phone />Call</a></Button>
          <Button asChild variant="outline" size="sm" disabled={!wa}><a href={wa || undefined} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a></Button>
          <Button asChild variant="outline" size="sm" disabled={!lead.email}><a href={lead.email ? `mailto:${lead.email}` : undefined}><Mail />Email</a></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}