import React from "react";
import { Card } from "@/components/ui/card";

function Tile({ label, value, tone = "text-slate-900" }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
    </Card>
  );
}

export default function InvitationStats({ invitations = [], expectedGuests = 0 }) {
  const attending = invitations.filter((i) => i.rsvp_status === "attending");
  const seats = attending.reduce((s, i) => s + (i.rsvp_party_size || 0), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <Tile label="Invitations" value={invitations.length} />
      <Tile label="Attending" value={attending.length} tone="text-emerald-600" />
      <Tile label="Declined" value={invitations.filter((i) => i.rsvp_status === "declined").length} tone="text-red-600" />
      <Tile label="Maybe" value={invitations.filter((i) => i.rsvp_status === "maybe").length} tone="text-amber-600" />
      <Tile label="Awaiting reply" value={invitations.filter((i) => !i.rsvp_status || i.rsvp_status === "invited").length} />
      <Tile label="Confirmed seats" value={`${seats} / ${expectedGuests || 0}`} tone="text-blue-600" />
    </div>
  );
}