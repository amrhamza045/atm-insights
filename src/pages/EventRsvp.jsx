import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, MapPin, PartyPopper, Check, X, HelpCircle } from "lucide-react";
import { toast } from "sonner";

export default function EventRsvp() {
  const token = new URLSearchParams(window.location.search).get("t");
  const [state, setState] = useState({ loading: true, error: "", invitation: null, event: null });
  const [choice, setChoice] = useState("");
  const [seats, setSeats] = useState(1);
  const [dietary, setDietary] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = async (action = "get", extra = {}) => {
    const res = await base44.functions.invoke("rsvpInvitation", { token, action, ...extra });
    if (res.data?.error) {
      setState({ loading: false, error: res.data.error, invitation: null, event: null });
      return null;
    }
    const { invitation, event } = res.data;
    setState({ loading: false, error: "", invitation, event });
    return invitation;
  };

  useEffect(() => {
    if (!token) {
      setState({ loading: false, error: "This invitation link is incomplete.", invitation: null, event: null });
      return;
    }
    load().then((inv) => {
      if (inv) {
        setChoice(inv.rsvp_status === "invited" ? "" : inv.rsvp_status);
        setSeats(inv.rsvp_party_size || inv.party_size || 1);
        setDietary(inv.dietary_notes || "");
        setMessage(inv.guest_message || "");
      }
    });
  }, [token]);

  const submit = async () => {
    if (!choice) return toast.error("Please choose your response");
    setSending(true);
    try {
      const inv = await load("respond", {
        rsvp_status: choice,
        rsvp_party_size: seats,
        dietary_notes: dietary,
        guest_message: message,
      });
      if (inv) toast.success("Thank you — your response was recorded");
    } finally {
      setSending(false);
    }
  };

  if (state.loading) return <div className="p-10 text-center text-slate-500">Loading your invitation…</div>;
  if (state.error) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <h1 className="text-lg font-semibold text-slate-900 mb-1">Invitation unavailable</h1>
        <p className="text-slate-500">{state.error}</p>
      </div>
    );
  }

  const { invitation, event } = state;
  const responded = invitation.rsvp_status !== "invited";

  return (
    <div className="max-w-lg mx-auto p-4 sm:p-8 space-y-4">
      <Card className="p-6 text-center space-y-2">
        <PartyPopper className="w-8 h-8 text-amber-500 mx-auto" />
        <p className="text-sm text-slate-500">You're invited, {invitation.guest_name}</p>
        <h1 className="text-2xl font-bold text-slate-900">{event?.event_name || "Our event"}</h1>
        {event?.event_date && (
          <p className="text-sm text-slate-600 flex items-center justify-center gap-1.5">
            <CalendarDays className="w-4 h-4" />
            {event.event_date}
            {event.start_time ? ` · ${event.start_time}${event.end_time ? `–${event.end_time}` : ""}` : ""}
          </p>
        )}
        {event?.venue_name && (
          <p className="text-sm text-slate-600 flex items-center justify-center gap-1.5">
            <MapPin className="w-4 h-4" /> {event.venue_name}
            {event.venue_address ? ` — ${event.venue_address}` : ""}
          </p>
        )}
        {event?.dress_code && <p className="text-xs text-slate-500">Dress code: {event.dress_code}</p>}
        {event?.theme && <p className="text-xs text-slate-500">Theme: {event.theme}</p>}
        <p className="text-xs text-slate-500">Seats reserved for you: {invitation.party_size}</p>
      </Card>

      <Card className="p-6 space-y-4">
        {responded && (
          <p className="text-sm font-medium text-emerald-700">
            Your current response: {invitation.rsvp_status}
            {invitation.rsvp_status === "attending" ? ` (${invitation.rsvp_party_size} guest(s))` : ""} — you can change it below.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant={choice === "attending" ? "default" : "outline"} className="gap-1.5" onClick={() => setChoice("attending")}>
            <Check className="w-4 h-4" /> I'll be there
          </Button>
          <Button variant={choice === "maybe" ? "default" : "outline"} className="gap-1.5" onClick={() => setChoice("maybe")}>
            <HelpCircle className="w-4 h-4" /> Maybe
          </Button>
          <Button variant={choice === "declined" ? "default" : "outline"} className="gap-1.5" onClick={() => setChoice("declined")}>
            <X className="w-4 h-4" /> Can't make it
          </Button>
        </div>

        {choice === "attending" && (
          <div>
            <Label>How many of you are coming? (max {invitation.party_size})</Label>
            <Input
              type="number"
              min="1"
              max={invitation.party_size}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
            />
          </div>
        )}

        {choice !== "declined" && (
          <div>
            <Label>Allergies or dietary needs</Label>
            <Textarea rows={2} value={dietary} onChange={(e) => setDietary(e.target.value)} />
          </div>
        )}

        <div>
          <Label>Message to the host (optional)</Label>
          <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>

        <Button className="w-full" disabled={sending} onClick={submit}>
          {sending ? "Sending…" : responded ? "Update my response" : "Send my response"}
        </Button>
      </Card>
    </div>
  );
}