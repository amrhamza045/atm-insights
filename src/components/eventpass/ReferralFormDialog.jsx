import React, { useState } from "react";
import { brandName } from "@/lib/brandName";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";

const EVENT_TYPES = ["Wedding", "Corporate", "Birthday", "Engagement", "Family Gathering", "Conference", "Other"];

export default function ReferralFormDialog({ open, onOpenChange, token }) {
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", event_type: "", expected_guests: "", event_date: "", notes: "" });
  const [state, setState] = useState({ saving: false, error: "", done: false });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setState({ saving: true, error: "", done: false });
    const res = await base44.functions.invoke("submitCateringReferral", { token, ...form });
    if (res.data?.error) return setState({ saving: false, error: res.data.error, done: false });
    setState({ saving: false, error: "", done: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Refer someone to {brandName()} Catering</DialogTitle>
        </DialogHeader>

        {state.done ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-slate-700">Thank you! Our team will reach out to them shortly.</p>
            <Button onClick={() => onOpenChange(false)} className="mt-2">Close</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Their name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" required />
            </div>
            <div>
              <Label>Company / organization</Label>
              <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01xxxxxxxxx" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@email.com" />
              </div>
            </div>
            <div>
              <Label>Event type</Label>
              <select
                value={form.event_type}
                onChange={(e) => set("event_type", e.target.value)}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select an event type</option>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Expected guests</Label>
                <Input type="number" min="0" value={form.expected_guests} onChange={(e) => set("expected_guests", e.target.value)} />
              </div>
              <div>
                <Label>Preferred date</Label>
                <Input type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything we should know?" />
            </div>

            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <p className="text-xs text-slate-500">Please provide at least a phone number or an email so we can contact them.</p>

            <Button type="submit" disabled={state.saving} className="w-full h-11">
              {state.saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Submit referral
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}