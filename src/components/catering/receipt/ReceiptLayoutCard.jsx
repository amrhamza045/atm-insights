import React from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleRow, BilingualText } from "./ReceiptFields";

export default function ReceiptLayoutCard({ value, set }) {
  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900">Header</h3>
        <p className="text-sm text-muted-foreground">Logo, name and contact details come from Admin › Branding.</p>
      </div>
      <BilingualText label="Receipt title" field="pdf_title" value={value} set={set} />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Logo position</Label>
          <div className="flex gap-2">
            {["left", "right"].map((side) => (
              <Button key={side} type="button" size="sm" variant={value.logo_position === side ? "default" : "outline"} onClick={() => set("logo_position", side)} className="capitalize">
                {side}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Kept on the same side in English and Arabic; the business details sit on the other side.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Accent colour</Label>
          <div className="flex gap-2 items-center">
            <input type="color" className="h-9 w-12 rounded border" value={value.accent_color || "#0b2647"} onChange={(e) => set("accent_color", e.target.value)} />
            <Input value={value.accent_color || ""} placeholder="Brand colour" onChange={(e) => set("accent_color", e.target.value)} />
            {value.accent_color && <Button type="button" size="sm" variant="ghost" onClick={() => set("accent_color", "")}>Reset</Button>}
          </div>
        </div>
      </div>
      <div className="divide-y">
        <ToggleRow label="Show logo" checked={value.show_logo} onChange={(v) => set("show_logo", v)} />
        <ToggleRow label="Show business name" checked={value.show_brand_name} onChange={(v) => set("show_brand_name", v)} />
        <ToggleRow label="Show business address, phones, email and website" checked={value.show_business_contact} onChange={(v) => set("show_business_contact", v)} />
      </div>
      <BilingualText label="Extra header lines" field="header_details" value={value} set={set} rows={2} hint="For example a tax or commercial registration number. One line per row." />
    </Card>
  );
}