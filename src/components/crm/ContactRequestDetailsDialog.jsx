import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const Row = ({ label, children }) => (
  <div className="grid grid-cols-3 gap-3 py-2 border-b border-slate-100 last:border-0">
    <dt className="text-xs font-medium text-slate-500">{label}</dt>
    <dd className="col-span-2 text-sm text-slate-800 whitespace-pre-line break-words">{children || "—"}</dd>
  </div>
);

export default function ContactRequestDetailsDialog({ lead, onOpenChange }) {
  return (
    <Dialog open={!!lead} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contact request</DialogTitle>
        </DialogHeader>
        {lead && (
          <dl>
            <Row label="Received">{lead.created_date && format(new Date(lead.created_date), "dd MMM yyyy, HH:mm")}</Row>
            <Row label="Status"><Badge variant="outline">{lead.status || "new"}</Badge></Row>
            <Row label="Name">{lead.sender_name}</Row>
            <Row label="Phone">{lead.phone && <a href={`tel:${lead.phone}`} className="text-amber-700">{lead.phone}</a>}</Row>
            <Row label="Email">{lead.email && <a href={`mailto:${lead.email}`} className="text-amber-700">{lead.email}</a>}</Row>
            <Row label="Governorate">{lead.governorate}</Row>
            <Row label="Address">{lead.address}</Row>
            <Row label="Interest">{lead.brand_purpose}</Row>
            <Row label="Details">{lead.message_text}</Row>
            {lead.notes && <Row label="Internal notes">{lead.notes}</Row>}
            {lead.converted_client_name && <Row label="Converted to">{lead.converted_client_name}</Row>}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}