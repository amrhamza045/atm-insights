import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UtensilsCrossed, ShoppingBag, Truck } from "lucide-react";

const TYPES = [
  { value: "delivery", label: "Delivery", icon: Truck },
  { value: "takeaway", label: "Takeaway", icon: ShoppingBag },
  { value: "dine_in", label: "Dine-In", icon: UtensilsCrossed }
];

export default function CallCenterCustomerPanel({ form, setForm, deliveryZones = [] }) {
  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-3 pb-3 border-b">
      <div className="flex gap-2">
        {TYPES.map((t) => (
          <Button
            key={t.value}
            size="sm"
            variant={form.order_type === t.value ? "default" : "outline"}
            onClick={() => set("order_type", t.value)}
            className="gap-1 flex-1"
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Customer Name <span className="text-red-500">*</span></Label>
          <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="Name" className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Phone <span className="text-red-500">*</span></Label>
          <Input value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} placeholder="01xxxxxxxxx" className="h-10" />
        </div>
      </div>

      {form.order_type === "delivery" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Delivery Address</Label>
            <Textarea value={form.delivery_address} onChange={(e) => set("delivery_address", e.target.value)} placeholder="Street, building, floor, landmark..." rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Delivery Zone</Label>
            <Select value={form.delivery_zone_id || ""} onValueChange={(v) => set("delivery_zone_id", v)}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select zone" /></SelectTrigger>
              <SelectContent>
                {deliveryZones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>{z.name} — {z.delivery_fee || 0} EGP</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Call Notes</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything the customer asked for..." rows={2} />
      </div>
    </div>
  );
}