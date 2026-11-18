import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, Mail, User, CalendarDays, Building2 } from "lucide-react";

const Row = ({ icon: Icon, label, value, href }) => (
  <div className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
    <Icon className="w-4 h-4 text-slate-400 mt-0.5" />
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      {value ? (
        href ? (
          <a href={href} className="text-sm font-medium text-amber-700 break-all">{value}</a>
        ) : (
          <p className="text-sm font-medium text-slate-900 break-all">{value}</p>
        )
      ) : (
        <p className="text-sm text-slate-400">Not provided</p>
      )}
    </div>
  </div>
);

export default function ReferrerContactDialog({ referral, mode = "referrer", open, onOpenChange }) {
  if (!referral) return null;
  const isReferred = mode === "referred";
  const phone = isReferred ? referral.phone : referral.referrer_phone;
  const email = isReferred ? referral.email : referral.referrer_email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isReferred ? "Referred person contact" : "Referrer contact"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <Row icon={User} label="Name" value={isReferred ? referral.sender_name : referral.referrer_name} />
          {isReferred && <Row icon={Building2} label="Company" value={referral.company} />}
          <Row icon={Phone} label="Phone" value={phone} href={phone ? `tel:${phone}` : null} />
          <Row icon={Mail} label="Email" value={email} href={email ? `mailto:${email}` : null} />
          {!isReferred && <Row icon={CalendarDays} label="Event attended" value={referral.referrer_event_name} />}
        </div>
        {!isReferred && !phone && !email && (
          <p className="text-xs text-slate-500">
            This guest left no contact details on their invitation — add them in the Invitations tab.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}