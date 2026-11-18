import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCircle } from "lucide-react";
import { format } from "date-fns";

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm text-slate-900 text-right break-words">{value || "—"}</span>
    </div>
  );
}

export default function ProfileCard({ client, actions }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCircle className="w-4 h-4 text-slate-500" /> Profile
        </CardTitle>
        {actions && <div className="flex gap-1.5">{actions}</div>}
      </CardHeader>
      <CardContent>
        <Row label="Name" value={client.name} />
        <Row label="Client type" value={client.client_type === "corporate" ? "Corporate" : "Individual"} />
        <Row label="Phone" value={client.phone} />
        <Row label="Email" value={client.email} />
        <Row label="Address" value={client.address} />
        <Row
          label="Added"
          value={client.created_date ? format(new Date(client.created_date), "dd MMM yyyy") : null}
        />
        <Row
          label="Status"
          value={<Badge variant={client.status === "active" ? "secondary" : "outline"}>{client.status || "—"}</Badge>}
        />
        {client.notes && <Row label="Notes" value={client.notes} />}
      </CardContent>
    </Card>
  );
}