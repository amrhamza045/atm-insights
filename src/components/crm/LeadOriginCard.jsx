import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";

export default function LeadOriginCard({ lead }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-slate-500" /> Lead Origin
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!lead ? (
          <p className="text-sm text-slate-500">No matching lead record — this client didn't come in as a lead.</p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{lead.platform || lead.source}</Badge>
              {lead.priority_label && <Badge variant="outline">{lead.priority_label}</Badge>}
              <Badge variant="outline">{lead.status}</Badge>
            </div>
            <p className="text-sm text-slate-900">{lead.lead_number || lead.contact_username || "—"}</p>
            {lead.converted_client_id ? (
              <p className="text-xs text-green-700">
                Converted link — this client was {lead.conversion_mode === "linked_existing" ? "linked to" : "created from"} this lead
                {lead.converted_by_email ? ` by ${lead.converted_by_email}` : ""}.
              </p>
            ) : (
              <p className="text-xs text-slate-500">Matched by email/phone only — not a converted lead link.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}