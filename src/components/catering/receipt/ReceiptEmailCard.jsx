import React from "react";
import { Card } from "@/components/ui/card";
import { BilingualText } from "./ReceiptFields";

const PLACEHOLDERS = ["client_name", "event_name", "event_date", "amount", "payment_type", "payment_method", "payment_date", "reference", "receipt_number", "event_total", "total_paid", "remaining", "brand_name"];

export default function ReceiptEmailCard({ value, set }) {
  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900">Email message</h3>
        <p className="text-sm text-muted-foreground">
          The email uses the receipt language. With both languages, the subject is the English one and the message shows English then Arabic.
        </p>
      </div>
      <BilingualText label="Subject" field="email_subject" value={value} set={set} />
      <BilingualText label="Message" field="email_body" value={value} set={set} rows={9} />
      <div className="flex flex-wrap gap-1.5">
        {PLACEHOLDERS.map((p) => (
          <code key={p} className="text-[11px] bg-slate-100 text-slate-700 rounded px-1.5 py-0.5">{`{{${p}}}`}</code>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">These placeholders work in the email and in every receipt text below.</p>
    </Card>
  );
}