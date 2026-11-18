import React from "react";
import { Card } from "@/components/ui/card";
import { ToggleRow, BilingualText } from "./ReceiptFields";

const SECTIONS = [
  ["show_client_contact", "Client phone and email"],
  ["show_event_details", "Event date, venue and guests"],
  ["show_payment_details", "Payment type, method, reference and date"],
  ["show_approval", "Approval date", "Shown with the payment details."],
  ["show_balance_summary", "Event total, paid and remaining"],
  ["show_payment_history", "Payment history", "Every approved payment up to this one."],
  ["show_signature", "Signature line"],
];

export default function ReceiptContentCard({ value, set }) {
  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900">Body and footer</h3>
        <p className="text-sm text-muted-foreground">Choose what the receipt shows below the header.</p>
      </div>
      <div className="divide-y">
        {SECTIONS.map(([key, label, hint]) => (
          <ToggleRow key={key} label={label} hint={hint} checked={value[key]} onChange={(v) => set(key, v)} />
        ))}
      </div>
      {value.show_signature && <BilingualText label="Signature label" field="signature_label" value={value} set={set} />}
      <BilingualText label="Note" field="notes" value={value} set={set} rows={2} />
      <BilingualText label="Footer" field="footer" value={value} set={set} rows={2} />
    </Card>
  );
}