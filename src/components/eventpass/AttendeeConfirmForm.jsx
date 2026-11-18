import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import RsvpChoiceButtons from "./RsvpChoiceButtons";

export default function AttendeeConfirmForm({ defaults, onConfirm, t = (k) => k }) {
  const [form, setForm] = useState({
    attendee_name: defaults?.guest_name || "",
    attendee_phone: defaults?.phone || "",
    attendee_email: defaults?.email || "",
  });
  const [choice, setChoice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!choice) return setError(t("err_choice"));
    if (!form.attendee_name.trim()) return setError(t("err_name"));
    if (!/^\+?[\d\s()-]{8,}$/.test(form.attendee_phone)) return setError(t("err_phone"));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.attendee_email)) return setError(t("err_email"));

    setError("");
    setSaving(true);
    try {
      await onConfirm({
        attendee_name: form.attendee_name.trim(),
        attendee_phone: form.attendee_phone.trim(),
        attendee_email: form.attendee_email.trim(),
        rsvp_status: choice,
      });
    } catch (err) {
      setError(err.message || t("err_generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label className="text-slate-600">{t("will_you_join")}</Label>
        <RsvpChoiceButtons value={choice} onChange={(v) => { setChoice(v); setError(""); }} t={t} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="attendee_name" className="text-slate-600">{t("full_name")}</Label>
        <Input id="attendee_name" value={form.attendee_name} onChange={set("attendee_name")}
          placeholder={t("full_name_ph")} className="h-12 rounded-xl bg-white" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="attendee_phone" className="text-slate-600">{t("phone")}</Label>
        <Input id="attendee_phone" type="tel" inputMode="tel" value={form.attendee_phone} onChange={set("attendee_phone")}
          placeholder="+20 1XXXXXXXXX" className="h-12 rounded-xl bg-white" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="attendee_email" className="text-slate-600">{t("email")}</Label>
        <Input id="attendee_email" type="email" value={form.attendee_email} onChange={set("attendee_email")}
          placeholder={t("email_ph")} className="h-12 rounded-xl bg-white" required />
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={saving}
        className="w-full h-14 rounded-xl text-base font-semibold bg-[#14452f] hover:bg-[#0f3524] text-white shadow-lg shadow-[#14452f]/20 transition-transform hover:-translate-y-0.5">
        {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
        {saving ? t("sending") : t("send_response")}
      </Button>
    </form>
  );
}