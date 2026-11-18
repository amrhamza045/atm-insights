import React from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleRow } from "./ReceiptFields";
import { RECEIPT_TYPE_LABELS } from "./receiptApi";

export default function ReceiptAutoSendCard({ value, set }) {
  const types = value.auto_send_types || [];
  const toggleType = (type, on) => set("auto_send_types", on ? [...types, type] : types.filter((t) => t !== type));
  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900">Sending</h3>
        <p className="text-sm text-muted-foreground">The receipt goes to the client's email on record, with the PDF attached.</p>
      </div>
      <ToggleRow
        label="Email the receipt automatically"
        hint="Sent the moment Finance approves a payment. Staff can always send or resend it from the payment."
        checked={value.auto_send}
        onChange={(v) => set("auto_send", v)}
      />
      {value.auto_send && (
        <div className="flex flex-wrap gap-4 ps-1">
          {Object.entries(RECEIPT_TYPE_LABELS).map(([type, label]) => (
            <label key={type} className="flex items-center gap-2 text-sm">
              <Checkbox checked={types.includes(type)} onCheckedChange={(on) => toggleType(type, !!on)} />
              {label}
            </label>
          ))}
        </div>
      )}
      {value.auto_send && types.includes("deposit") && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-md px-3 py-2">
          While deposit receipts are automatic, the client no longer gets the plain "Deposit received" email from Admin › Email, so they don't receive two.
        </p>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Receipt language</Label>
          <Select value={value.language} onValueChange={(v) => set("language", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ar">Arabic</SelectItem>
              <SelectItem value="both">Both (two PDFs)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Sender name</Label>
          <Input value={value.from_name || ""} placeholder="Your brand name" onChange={(e) => set("from_name", e.target.value)} />
        </div>
      </div>
    </Card>
  );
}