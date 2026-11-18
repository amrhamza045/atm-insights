import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ClientSearchSelect from "./ClientSearchSelect";
import CateringOptionSelect from "./CateringOptionSelect";
import { diffEvent, logEventAudit } from "./eventAudit";
import SpecialRequestsEditor from "./SpecialRequestsEditor";
import VenueMapPicker from "./VenueMapPicker";
import { validateEvent, deriveDurationHours } from "./cateringLogic";
import { rescaleActiveQuoteForGuests } from "./quoteRescale";
import { useBranch } from "@/components/branches/BranchContext";
import PolicyBookingNotice from "./payment-policies/PolicyBookingNotice";
import { callPaymentPolicy, refreshEventPolicy, hasPaymentPolicy, withoutPolicyFields } from "./payment-policies/eventPolicyClient";

const todayInputValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyEvent = {
  client_id: "", client_name: "", client_phone: "",
  event_name: "", event_type: "", event_date: "", start_time: "", end_time: "",
  location_type: "on_site", venue_name: "", venue_address: "",
  venue_setting: "indoor", venue_lat: "", venue_lng: "",
  theme: "", decoration_requirements: "", service_style: "", dress_code: "",
  special_requests: [],
  onsite_contact_name: "", onsite_contact_phone: "",
  expected_guests: "", guaranteed_guests: "", guarantee_cutoff_date: "",
  deposit_percentage: 50, notes: "",
};

export default function EventFormDialog({ open, onOpenChange, event, onCreated }) {
  const queryClient = useQueryClient();
  const { selectedBranch, selectedBranchId } = useBranch();
  const [form, setForm] = useState(emptyEvent);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const errorBoxRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm(event ? { ...emptyEvent, ...event } : emptyEvent);
      setErrors([]);
    }
  }, [open, event]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  // Deposit % only on events booked before payment policies; everything else follows its policy.
  const legacyDeposit = !!event?.id && !hasPaymentPolicy(event);

  const handleSave = async () => {
    const payload = {
      ...withoutPolicyFields(form),
      branch_id: selectedBranchId,
      branch_name: selectedBranch?.name || "",
      // Staff can name the event manually; falls back to type — client when left empty.
      event_name: form.event_name?.trim() || [form.event_type, form.client_name].filter(Boolean).join(" — "),
      expected_guests: Number(form.expected_guests) || 0,
      guaranteed_guests: Number(form.guaranteed_guests) || 0,
      deposit_percentage: Number(form.deposit_percentage) || 0,
      venue_lat: form.venue_lat === "" || form.venue_lat === null ? undefined : Number(form.venue_lat),
      venue_lng: form.venue_lng === "" || form.venue_lng === null ? undefined : Number(form.venue_lng),
      special_requests: (form.special_requests || []).filter((r) => r.detail?.trim()),
      duration_hours: deriveDurationHours(form.start_time, form.end_time),
    };
    const found = validateEvent(payload, { previousDate: event?.event_date });
    setErrors(found);
    if (found.length) {
      // The dialog body scrolls — bring the error summary into view so the
      // submission never looks unresponsive.
      toast.error(`Please fix ${found.length} field(s) before saving`);
      requestAnimationFrame(() => {
        errorBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    setSaving(true);
    try {
      if (event?.id) {
        const isReschedule = event.event_date !== payload.event_date;
        if (isReschedule) {
          const user = await base44.auth.me();
          payload.reschedule_history = [
            ...(event.reschedule_history || []),
            {
              previous_date: event.event_date,
              new_date: payload.event_date,
              changed_by: user?.email || "",
              changed_date: new Date().toISOString(),
              reason: "Rescheduled",
            },
          ];
        }
        await base44.entities.CateringEvent.update(event.id, payload);
        const changes = diffEvent(event, payload);
        if (Object.keys(changes).length) {
          logEventAudit("update", event, `${isReschedule ? "Rescheduled" : "Edited"} event: ${Object.keys(changes).join(", ")}`, changes);
        }
        toast.success(isReschedule ? "Event rescheduled — deposit stays attached" : "Event updated");
        // A new date re-applies the payment policy; the server rebuilds the deposit.
        if (isReschedule && hasPaymentPolicy(event)) {
          await refreshEventPolicy(event.id)
            .then((res) => res.policy_name !== event.payment_policy_name && toast.message(`Payment policy is now "${res.policy_name}"`))
            .catch((e) => toast.error(e.message));
        }

        // Guest count drives the quote — rescale the active quote automatically.
        const updated = { ...event, ...payload };
        const newGuests = Number(updated.guarantee_locked ? updated.guaranteed_guests : updated.expected_guests) || 0;
        const rescaled = await rescaleActiveQuoteForGuests(updated, newGuests);
        if (rescaled) {
          await queryClient.invalidateQueries({ queryKey: ["catering-quotes"] });
          toast.success(
            `Quote ${rescaled.revision} recalculated for ${rescaled.newGuests} guests — new total ${rescaled.total.toLocaleString()} EGP`
          );
        }
      } else {
        // Booked through the server so the payment policy for its date is applied (no policy → refused).
        const { event: created } = await callPaymentPolicy("book", { event: payload });
        logEventAudit("create", created, `Booked event for ${payload.event_date || "no date"}`);
        toast.success("Event booked");
        await queryClient.invalidateQueries({ queryKey: ["catering-events"] });
        onOpenChange(false);
        onCreated?.(created);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["catering-events"] });
      onOpenChange(false);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Could not save the event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event?.id ? "Edit Event" : "Book Catering Event"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {errors.length > 0 && (
            <div ref={errorBoxRef} className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
              {errors.map((e, i) => <p key={i} className="text-sm text-red-700">• {e}</p>)}
            </div>
          )}

          <div>
            <Label className="mb-1.5 block">Client *</Label>
            <ClientSearchSelect
              value={form.client_id}
              onSelect={(c) => setForm((f) => ({
                ...f,
                client_id: c?.id || "",
                client_name: c?.name || "",
                client_phone: c?.phone || "",
              }))}
            />
          </div>

          <div>
            <Label>Event name</Label>
            <Input
              value={form.event_name || ""}
              onChange={(e) => set("event_name", e.target.value)}
              placeholder={[form.event_type, form.client_name].filter(Boolean).join(" — ") || "Auto-generated from event type and client"}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Event type *</Label>
              <CateringOptionSelect listType="event_type" value={form.event_type} onChange={(v) => set("event_type", v)} placeholder="Select event type" />
            </div>
            <div><Label>Event date *</Label><Input type="date" min={todayInputValue()} value={form.event_date || ""} onChange={(e) => set("event_date", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Start</Label><Input type="time" value={form.start_time || ""} onChange={(e) => set("start_time", e.target.value)} /></div>
              <div><Label>End</Label><Input type="time" value={form.end_time || ""} onChange={(e) => set("end_time", e.target.value)} /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Location</Label>
              <Select value={form.location_type} onValueChange={(v) => set("location_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_site">On-site (branch)</SelectItem>
                  <SelectItem value="off_site">Off-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Venue name</Label><Input value={form.venue_name || ""} onChange={(e) => set("venue_name", e.target.value)} /></div>
            <div><Label>Venue address{form.location_type === "off_site" ? " *" : ""}</Label><Input value={form.venue_address || ""} onChange={(e) => set("venue_address", e.target.value)} /></div>
          </div>

          <div>
            <Label className="mb-1.5 block">Pick location on map</Label>
            <VenueMapPicker
              address={form.venue_address}
              lat={form.venue_lat}
              lng={form.venue_lng}
              onPick={({ address, lat, lng }) =>
                setForm((f) => ({ ...f, venue_address: address, venue_lat: lat, venue_lng: lng }))
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Indoor / outdoor</Label>{/* GPS coordinates removed from the form */}
              <Select value={form.venue_setting || "indoor"} onValueChange={(v) => set("venue_setting", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="indoor">Indoor</SelectItem>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Service style</Label>
              <CateringOptionSelect listType="service_style" value={form.service_style} onChange={(v) => set("service_style", v)} placeholder="Buffet, plated, live stations…" />
            </div>
            <div>
              <Label>Dress code</Label>
              <CateringOptionSelect listType="dress_code" value={form.dress_code} onChange={(v) => set("dress_code", v)} placeholder="Select dress code" />
            </div>
            <div><Label>Theme</Label><Input value={form.theme || ""} onChange={(e) => set("theme", e.target.value)} /></div>
            <div><Label>Decoration requirements</Label><Input value={form.decoration_requirements || ""} onChange={(e) => set("decoration_requirements", e.target.value)} /></div>
          </div>

          <div>
            <Label className="mb-1.5 block">Special requests (visible to planning & kitchen)</Label>
            <SpecialRequestsEditor requests={form.special_requests || []} onChange={(v) => set("special_requests", v)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Event-day contact name</Label><Input value={form.onsite_contact_name || ""} onChange={(e) => set("onsite_contact_name", e.target.value)} /></div>
            <div><Label>Event-day contact phone</Label><Input value={form.onsite_contact_phone || ""} onChange={(e) => set("onsite_contact_phone", e.target.value)} /></div>
          </div>

          <div className={`grid grid-cols-1 ${legacyDeposit ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-3`}>
            <div><Label>Expected guests *</Label><Input type="number" min="1" value={form.expected_guests} onChange={(e) => set("expected_guests", e.target.value)} /></div>
            <div><Label>Guaranteed guests</Label><Input type="number" min="0" value={form.guaranteed_guests} onChange={(e) => set("guaranteed_guests", e.target.value)} /></div>
            <div><Label>Guarantee cutoff</Label><Input type="date" value={form.guarantee_cutoff_date || ""} onChange={(e) => set("guarantee_cutoff_date", e.target.value)} /></div>
            {legacyDeposit && <div><Label>Deposit %</Label><Input type="number" min="0" max="100" value={form.deposit_percentage} onChange={(e) => set("deposit_percentage", e.target.value)} /></div>}
          </div>
          {!legacyDeposit && <PolicyBookingNotice eventDate={form.event_date} event={event} />}

          <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} /></div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{event?.id ? "Save changes" : "Book event"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}