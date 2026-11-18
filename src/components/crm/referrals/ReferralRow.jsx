import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Contact } from "lucide-react";
import { format } from "date-fns";

export const STATUSES = ["new", "contacted", "converted", "closed"];
export const STATUS_STYLES = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  converted: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-600",
};

function ContactsButton({ onClick, className = "" }) {
  return (
    <Button size="sm" variant="outline" className={`h-7 gap-1 ${className}`} onClick={onClick}>
      <Contact className="w-3.5 h-3.5" /> Contacts
    </Button>
  );
}

// children: an optional extra last cell (the commission column).
export default function ReferralRow({ referral: r, eventName, onStatus, onContact, children }) {
  return (
    <TableRow>
      <TableCell className="text-xs text-slate-500 whitespace-nowrap align-top">
        {r.created_date ? format(new Date(r.created_date), "dd MMM yyyy") : "—"}
      </TableCell>
      <TableCell className="align-top">
        <p className="font-medium text-slate-900">{r.sender_name || "—"}</p>
        {r.company && <p className="text-xs text-slate-500">{r.company}</p>}
        <ContactsButton className="mt-1" onClick={() => onContact("referred")} />
      </TableCell>
      <TableCell className="text-xs text-slate-600 align-top">
        {r.phone && <p>{r.phone}</p>}
        {r.email && <p className="break-all">{r.email}</p>}
        {!r.phone && !r.email && "—"}
      </TableCell>
      <TableCell className="text-xs text-slate-600 align-top">{r.brand_purpose || "—"}</TableCell>
      <TableCell className="text-xs text-slate-600 align-top">
        <p className="font-medium text-slate-900 mb-1">{r.referrer_name || "—"}</p>
        <ContactsButton onClick={() => onContact("referrer")} />
      </TableCell>
      <TableCell className="text-xs text-slate-500 whitespace-pre-line max-w-[280px] align-top">
        {eventName && <p>Source event: {eventName}</p>}
        {r.message_text && <p>{r.message_text}</p>}
      </TableCell>
      <TableCell className="align-top">
        <Select value={r.status || "new"} onValueChange={onStatus}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      {children && <TableCell className="align-top">{children}</TableCell>}
    </TableRow>
  );
}