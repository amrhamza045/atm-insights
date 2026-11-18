import React, { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const empty = {
  name: "", service_type: "photographer", tier: "mid_range", phone: "", instagram: "",
  price_basis: "per_event", price: "", coverage_hours: "", deliverables: "", notes: "",
};

export default function MediaVendorFormDialog({ vendor, open, onOpenChange, onSave, saving }) {
  const [form, setForm] = useState(vendor ? { ...empty, ...vendor } : empty);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{vendor ? "Edit vendor" : "Add photographer / videographer"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Studio or freelancer name" />
          </div>
          <div>
            <Label>Service</Label>
            <Select value={form.service_type} onValueChange={(v) => set("service_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="photographer">Photographer</SelectItem>
                <SelectItem value="videographer">Videographer</SelectItem>
                <SelectItem value="both">Photo + Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tier</Label>
            <Select value={form.tier} onValueChange={(v) => set("tier", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="budget">Budget</SelectItem>
                <SelectItem value="mid_range">Mid-range</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Price basis</Label>
            <Select value={form.price_basis} onValueChange={(v) => set("price_basis", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="per_event">Per event</SelectItem>
                <SelectItem value="per_hour">Per hour</SelectItem>
                <SelectItem value="per_day">Per day</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Price (EGP)</Label>
            <Input type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} />
          </div>
          <div>
            <Label>Coverage hours</Label>
            <Input type="number" min="0" value={form.coverage_hours} onChange={(e) => set("coverage_hours", e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Portfolio / Instagram</Label>
            <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@handle or link" />
          </div>
          <div className="sm:col-span-2">
            <Label>Deliverables</Label>
            <Textarea rows={2} value={form.deliverables} onChange={(e) => set("deliverables", e.target.value)} placeholder="Edited photos, highlight reel, album…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700"
            disabled={saving || !form.name}
            onClick={() => onSave({
              ...form,
              price: Number(form.price) || 0,
              coverage_hours: Number(form.coverage_hours) || 0,
            })}
          >
            {saving ? "Saving…" : "Save vendor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}