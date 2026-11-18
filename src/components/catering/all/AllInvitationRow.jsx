import React from "react";
import { QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { wasSent } from "@/components/catering/invitationSend";
import OpenEventButton from "./OpenEventButton";

/** One invited guest in the all-events Invitations list. */
export default function AllInvitationRow({ invitation: inv }) {
  return (
    <TableRow>
      <TableCell className="font-medium text-slate-900">{inv.guest_name}</TableCell>
      <TableCell>{inv.event_name || "—"}</TableCell>
      <TableCell className="text-sm text-slate-500">{inv.email || inv.phone || "—"}</TableCell>
      <TableCell>
        <Badge className={inv.pass_code ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
          {inv.pass_code ? "confirmed" : "awaiting"}
        </Badge>
      </TableCell>
      <TableCell className="text-xs font-mono text-slate-500">
        {inv.pass_code ? <span className="inline-flex items-center gap-1"><QrCode className="w-3.5 h-3.5" />{inv.pass_code}</span> : "—"}
      </TableCell>
      <TableCell>
        {wasSent(inv)
          ? <Badge className="bg-blue-100 text-blue-700">{inv.last_sent_channel || "sent"}</Badge>
          : <span className="text-xs text-slate-400">Not sent</span>}
      </TableCell>
      <TableCell className="text-right"><OpenEventButton tab="invi222" eventId={inv.event_id} /></TableCell>
    </TableRow>
  );
}