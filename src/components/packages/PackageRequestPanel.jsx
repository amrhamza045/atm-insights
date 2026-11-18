import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { X, Send } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EGYPT_GOVERNORATES } from "./egyptGovernorates";
import { getContactBrowserId } from "./contactBrowserId";

const EMPTY = { name: "", phone: "", email: "", governorate: "", address: "", event_type: "", event_date: "", guests: "", notes: "" };

export default function PackageRequestPanel({ selected = [], onRemove, onSubmitted, onBrowse, bare = false }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    if (!form.name || !form.phone || !form.governorate) {
      toast.error("Please add your name, phone number and governorate");
      return;
    }
    setSaving(true);
    try {
      const res = await base44.functions
        .invoke("submitContactRequest", { ...form, packages: selected.map((p) => (p.chosen_extras?.length ? `${p.name} (extras: ${p.chosen_extras.map((x) => x.name).join(", ")})` : p.name)), browser_id: getContactBrowserId() })
        .catch((err) => err.response || { data: { error: "Something went wrong. Please try again." } });
      if (!res.data?.ok) {
        toast.error(res.data?.error || "Something went wrong. Please try again.");
        return;
      }
      toast.success("Thank you! Your request was submitted and our team will contact you soon.");
      setForm(EMPTY);
      onSubmitted?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={bare ? "border-0 shadow-none" : "sticky top-20"}>
      <CardContent className={bare ? "p-0 space-y-6" : "p-5 space-y-4"}>
        {bare ? (
          <div>
            <p className="text-xs font-semibold tracking-[0.3em] uppercase text-[hsl(var(--landing-gold))]">Get in touch</p>
            <h3 className="font-heading mt-2 text-3xl font-medium text-[hsl(var(--landing-navy))]">Contact Us</h3>
          </div>
        ) : (
          <h3 className="font-bold text-slate-900">Contact Us</h3>
        )}

        {selected.length === 0 ? (
          <p className={bare ? "text-base text-slate-600 -mt-3" : "text-sm text-slate-500"}>Send us your details and we'll get back to you — or select packages above to request a quote.</p>
        ) : (
          <div className="space-y-2">
            {selected.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-sm text-slate-800">
                  {p.name}
                  {p.chosen_extras?.length > 0 && <span className="block text-xs text-slate-500">+ {p.chosen_extras.map((x) => x.name).join(", ")}</span>}
                </span>
                <button onClick={() => onRemove(p)} className="text-slate-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className={bare ? "grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5 [&_label]:mb-1.5 [&_label]:block [&_label]:text-sm [&_label]:font-semibold [&_input]:h-12 [&_input]:rounded-xl [&_input]:bg-white [&_input]:text-base [&_textarea]:rounded-xl [&_textarea]:bg-white [&_textarea]:text-base [&_button[role=combobox]]:h-12 [&_button[role=combobox]]:rounded-xl [&_button[role=combobox]]:bg-white [&_button[role=combobox]]:text-base" : "space-y-3"}>
          <div>
            <Label>Your name *</Label>
            <Input value={form.name} onChange={set("name")} />
          </div>
          <div>
            <Label>Phone *</Label>
            <Input value={form.phone} onChange={set("phone")} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <Label>Governorate *</Label>
            <Select value={form.governorate} onValueChange={(v) => setForm({ ...form, governorate: v })}>
              <SelectTrigger><SelectValue placeholder="Select governorate" /></SelectTrigger>
              <SelectContent className="z-[200]">
                {EGYPT_GOVERNORATES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className={bare ? "sm:col-span-2" : ""}>
            <Label>Address</Label>
            <Input value={form.address} onChange={set("address")} placeholder="Optional" />
          </div>
          <div>
            <Label>Event type</Label>
            <Input value={form.event_type} onChange={set("event_type")} placeholder="Wedding, birthday, corporate…" />
          </div>
          <div className={bare ? "sm:col-span-2 grid grid-cols-2 gap-5" : "grid grid-cols-2 gap-3"}>
            <div>
              <Label>Event date</Label>
              <Input type="date" value={form.event_date} onChange={set("event_date")} />
            </div>
            <div>
              <Label>Guests</Label>
              <Input type="number" value={form.guests} onChange={set("guests")} />
            </div>
          </div>
          <div className={bare ? "sm:col-span-2" : ""}>
            <Label>Notes</Label>
            <Textarea rows={bare ? 4 : 3} value={form.notes} onChange={set("notes")} placeholder={bare ? "Tell us anything that helps us plan your event" : undefined} />
          </div>
        </div>

        <Button
          className={bare ? "w-full h-12 gap-2 rounded-xl text-base font-semibold bg-[hsl(var(--landing-gold))] text-[hsl(var(--landing-navy))] hover:opacity-90" : "w-full gap-2"}
          disabled={saving}
          onClick={submit}
        >
          <Send className="w-4 h-4" />
          {saving ? "Sending..." : "Send request"}
        </Button>
      </CardContent>
    </Card>
  );
}