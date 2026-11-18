import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Pencil, Trash2, UserCheck, Mail, MessageCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { invitationLink } from "./invitationTokens";
import { sendInvitation, wasSent } from "./invitationSend";

const STATUS_STYLES = {
  attending: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
  maybe: "bg-amber-100 text-amber-700",
  invited: "bg-slate-100 text-slate-600",
};

export default function InvitationsTable({ invitations, eventId, event, onEdit }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["catering-invitations", eventId] });

  const copyLink = (token) => {
    navigator.clipboard.writeText(invitationLink(token));
    toast.success("Invitation link copied");
  };

  const send = async (inv, channel) => {
    try {
      await sendInvitation(inv, event, channel);
      toast.success(`Invitation sent to ${inv.guest_name}`);
      refresh();
    } catch (err) {
      toast.error(err.message || "Invitation could not be sent");
    }
  };

  const toggleCheckIn = async (inv) => {
    await base44.entities.CateringInvitation.update(inv.id, {
      checked_in: !inv.checked_in,
      checked_in_at: inv.checked_in ? null : new Date().toISOString(),
    });
    refresh();
  };

  const remove = async (inv) => {
    await base44.entities.CateringInvitation.delete(inv.id);
    toast.success("Guest removed");
    refresh();
  };

  if (invitations.length === 0) {
    return <p className="text-sm text-slate-500 py-6 text-center">No guests invited yet.</p>;
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Guest</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Seats</TableHead>
            <TableHead>Sent</TableHead>
            <TableHead>RSVP</TableHead>
            <TableHead>Dietary</TableHead>
            <TableHead>Table</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="font-medium">
                {inv.guest_name}
                {inv.checked_in && <Badge className="ml-2 bg-blue-100 text-blue-700">Checked in</Badge>}
              </TableCell>
              <TableCell className="text-xs text-slate-500">{inv.email || inv.phone || "—"}</TableCell>
              <TableCell className="text-sm">
                {inv.rsvp_status === "attending" ? `${inv.rsvp_party_size || 0} / ${inv.party_size || 1}` : inv.party_size || 1}
              </TableCell>
              <TableCell>
                {wasSent(inv) ? (
                  <Badge className="bg-blue-100 text-blue-700">{inv.last_sent_channel || "sent"}</Badge>
                ) : (
                  <span className="text-xs text-slate-400">not sent</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={STATUS_STYLES[inv.rsvp_status] || STATUS_STYLES.invited}>
                  {inv.rsvp_status || "invited"}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-slate-500 max-w-[160px] truncate">{inv.dietary_notes || "—"}</TableCell>
              <TableCell className="text-sm">{inv.table_assignment || "—"}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button size="icon" variant="ghost" onClick={() => copyLink(inv.token)} title="Copy invitation link">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" disabled={!inv.email} onClick={() => send(inv, "email")} title="Email invitation link">
                  <Mail className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" disabled={!inv.phone} onClick={() => send(inv, "whatsapp")} title="Send by WhatsApp">
                  <MessageCircle className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" disabled={!inv.phone} onClick={() => send(inv, "sms")} title="Send by SMS">
                  <Smartphone className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => toggleCheckIn(inv)} title="Check in / undo">
                  <UserCheck className={`w-4 h-4 ${inv.checked_in ? "text-blue-600" : ""}`} />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onEdit(inv)} title="Edit">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-red-600" onClick={() => remove(inv)} title="Remove">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}